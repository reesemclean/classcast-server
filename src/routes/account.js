var UserModel = require('../models/user').model
var DeviceModel = require('../models/device').model;
var LinkModel = require('../models/link').model;
var GroupModel = require('../models/group').model;

var passport = require('passport');
var AccessTokenModel = require('../models/accessToken').model;
	
var authUtils = require('../auth/authUtils');
var config = require('../../config');

// export route event handlers
module.exports = function attachHandlers (router) {
	
	// post requests
	router.post('/api/account', createUser);
	router.post('/api/account/changeDisplayName', passport.authenticate('bearer', { session: false }), changeDisplayName);
	router.post('/api/account/deviceDidLogout', passport.authenticate('bearer', { session: false }), deviceDidLogOut);
	router.post('/api/account/requestNewRegistrationToken', passport.authenticate('bearer', { session: false }), newRegistrationToken);
	router.post('/api/account/requestNewGroupRegistrationToken', passport.authenticate('bearer', { session: false }), newGroupRegistrationToken);
	
};

function randomUniqueRegistrationToken(callback) {
	
	var length = 6
	var text = "";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

	for( var i=0; i < length; i++ )
	text += possible.charAt(Math.floor(Math.random() * possible.length));

	
	UserModel.findOne({ registrationToken: text }, function(err, user) {
	  	
		if (err) {
			return callback(err, null);
		}
		  
		if (user) {
			return randomUniqueRegistrationToken(callback);
		}
		  
		callback(null, text);
		
	});
}

function randomUniqueGroupRegistrationToken(callback) {
	
	var length = 6
	var text = "G";
	var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

	for( var i=0; i < length; i++ )
	text += possible.charAt(Math.floor(Math.random() * possible.length));

	GroupModel.findOne({ registrationToken: text }, function(err, group) {
	  	
		if (err) {
			return callback(err, null);
		}
		  
		if (group) {
			return randomUniqueRegistrationToken(callback);
		}
		  
		callback(null, text);
		
	});
	
}

function newGroupRegistrationToken(req, res) {

	var user = req.user;
	var groupGUID = req.body.groupGUID;
	
	GroupModel.findOne({ guid: groupGUID }, function(err, group) {
		
		if (err) {
			return res.json(500,err);
		}
		
		if (!group) {
			return res.json(404, new Error("Could not find group"));
		}
		
		randomUniqueGroupRegistrationToken(function(err, token) {
		
			if (err) {
				return res.json(500,err);
			}
		
			group.registrationToken = token;
			group.save(function(err) {
				if (err) {
					return res.json(500,err);
				}
				
				res.json(group);
			});
		
		});
		
	});
	
}

function newRegistrationToken (req, res) {
	
	var user = req.user;
	
	randomUniqueRegistrationToken(function(err, token) {
	
		if (err) {
			return res.json(500, err);
		}
				
		user.registrationToken = token;
		user.save(function(err) {
			
			if (err) {
				return res.json(500, err);
			}
			
			var userDict = user.toObject();

			delete userDict['hashedPassword'];
							
			res.json(userDict);
			
		});
		
	});
	
}

function createUser (req, res) {

	UserModel.findOne({ emailAddress: req.body.emailAddress }, function (err, user) {
		
		if (err) {
			return res.json(500,err);
		}
		
		if (user) {
			return res.json(409, new Error("Email address has already been taken."));
		}
		
		var password = req.body.password;

		authUtils.hashPassword(password, function(err, hash) {
		
			if (err) {
				return res.json(500,err);
			}
		
			var newUser = new UserModel({ 
				displayName: req.body.displayName,
				emailAddress: req.body.emailAddress,
				hashedPassword: hash
			});
	 
			randomUniqueRegistrationToken(function(err, token) {
			 	
				if (err) {
					return res.json(500,err);
				}
				
				newUser.registrationToken = token;
				
				newUser.save(function (err, user) {
					if (err) {
						return res.json(500,err);
					}
		
					var newAccessToken = new AccessTokenModel({ 
	
						userId: user._id,

					});
 
					newAccessToken.save(function (err, accessToken) {
					
						if (err) {
							user.remove();
							return res.json(500,err);
						}
		
						var userDict = user.toObject();
		
						delete userDict['hashedPassword'];
		
						dictionaryToReturn = {
							token: accessToken._id,
							user: userDict
						}
														
						res.json(dictionaryToReturn);
			
					});
		
		
				});
			
			});
	 
			
		})
		
	})
	
};

function changeDisplayName(req, res) {
	
	var user = req.user;
	var newDisplayName = req.body.displayName;
		
	user.displayName = newDisplayName;
		
	user.save(function (err) {
		
		if (err) {
			return res.json(500,err);
		}
		
		var userDict = user.toObject();
		delete userDict['hashedPassword'];
						
		res.json(userDict);
		
	});
}

function deviceDidLogOut(req, res) {
	
	var user = req.user;
	var usersDeviceToken = req.body.usersDeviceToken;
	
    var indexOfDeviceToken = user.usersDeviceTokens ? user.usersDeviceTokens.indexOf(usersDeviceToken) : -1;
	
	if (indexOfDeviceToken == -1) {
		return res.json({});
	}
	
	user.usersDeviceTokens.splice(idx, 1);
	user.save(function(err){
		
		if (err) {
			return res.json(500,err);
		}
		
		return res.json({});
		
	})
}