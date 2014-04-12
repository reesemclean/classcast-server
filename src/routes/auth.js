var passport = require('passport');

var	AccessTokenModel = require('../models/accessToken').model;
var	UserModel = require('../models/user').model;

var authUtils = require('../auth/authUtils');

var config = require('../../config');
var mandrillKey = config.mandrill.key;
var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill(mandrillKey);

// export route event handlers
module.exports = function attachHandlers (router) {
    
	router.post('/api/auth/token', passport.authenticate('basic', { session: false }), token);
	router.post('/api/auth/changePassword', passport.authenticate('basic', { session: false }), changePassword);
	router.post('/api/auth/forgot', forgotPassword);
	router.post('/api/auth/reset', resetPassword);
};

function token (req, res) {
		
	UserModel.findById(req.user._id, function (err, user) {
		
		if (err) {
			return res.json(500, err);
		}
		
		if (!user) {
			return res.json(404, err);
		}
		
		var newAccessToken = new AccessTokenModel({ 
	
			userId: req.user._id,

		 });
 
		newAccessToken.save(function (err, accessToken) {
			if (err) {
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

}

function changePassword (req, res) {
	
	var user = req.user;
	var logoutDevices = req.body.logoutDevices;
	var password = req.body.newPassword;

	authUtils.hashPassword(password, function(err, hash) {
			
		if (err) {
			return res.json(500,err);
		}
	
		user.hashedPassword = hash;
 
		user.save(function (err, user) {
			if (err) {
				return res.json(500,err);
			}
	
			deleteOldTokens(logoutDevices, user._id, function(err) {
				
				if (err) {
					return res.json(500,err);
				}
				
				var newAccessToken = new AccessTokenModel({ 

					userId: user._id,

				 });

				newAccessToken.save(function (err, accessToken) {
				
					if (err) {
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
				
			})
	
	
		});
	})
	
}

// Forgot Password Process
// User taps forgot password
// Show screen with send password reset/enter temporary password
// generate a small token with and expiration date
// send email with token
// user enters temporary password and new password (ssl needed)
// User has option to delete old tokens at that step
// new token is created
// user receives new token and is logged in

function forgotPassword (req, res) {
	
	UserModel.findOne({ emailAddress: req.body.emailAddress }, function(err, user) {
		
		if (!user) {
			res.json({});
			return;
		}
		
		user.resetPasswordToken = createTemporaryPasswordWithLength(6);
		
		var twoHoursFromNow = new Date();
		twoHoursFromNow.setHours(twoHoursFromNow.getHours() + 2);
		user.resetPasswordExpireDate = twoHoursFromNow; //2 Hours expiration
		
		var displayName = user.displayName;
		if (!displayName) {
			displayName = user.emailAddress;
		}
		
		var resetToken = user.resetPasswordToken;
		
		var html = "Hi " + displayName +  ",<br><br>" + "We were told that you forgot your password. Sorry about that. To reset your password:<br><br>" + "Tap this link on a device with the ClassCast: Teacher Edition installed:<br><br>" + "<a href=\"" + config.passwordReset.URLScheme + "/" + resetToken + "\"" + ">Tap Here</a><br><br>" + "Or enter this code in the password reset account view in the app:<br><br>" + resetToken + "<br><br>If you have any questions please contact us at <a href=\"mailto:" + config.support.email + "\">" + config.support.email + "</a>"
		
		user.save(function(err, user) {
			
			if (err) {
				return res.json(500,err);
			}
			
			//Send Email using user object
				
			var message = {
			    "html": html,
			    "subject": "Reset Password",
			    "from_email": config.passwordReset.email,
			    "from_name": "Password Reset",
			    "to": [{
			            "email": req.body.emailAddress
			        }],
			    "headers": {
			        "Reply-To": config.support.email
			    },
			    "tags": [
			        "password-resets"
			    ]
			};
			var async = true;
			mandrill_client.messages.send({"message": message, "async": async}, function(result) {
				res.json({});
			}, function(e) {
			    // Mandrill returns the error as an object with name and message keys
			    console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
				res.json(500);
			    // A mandrill error occurred: PaymentRequired - This feature is only available for accounts with a positive balance.
			});	
										
		});
		
	});
	
}

function resetPassword (req, res) {
	
	UserModel.findOne( { resetPasswordToken: req.body.resetPasswordToken }, function(err, user) {
		
		if (err) {
			return res.json(500,err);
		}
		
		if (!user) {
			return res.json(404, new Error('Could not find this password reset code.'));
		}
		
		var now = new Date();
		
		if(now.getTime() > user.resetPasswordExpireDate) {
			return res.json(401);
		}
		
		var password = req.body.newPassword;

		authUtils.hashPassword(password, function(err, hash) {
				
			if (err) {
				return res.json(500,err);
			}
		
			user.hashedPassword = hash;
	 	   	user.resetPasswordToken = null;
			user.resetPasswordExpireDate = null;
			
			user.save(function (err, user) {
				if (err) {
					return res.json(500,err);
				}
		
				deleteOldTokens(req.body.shouldDeleteOldTokens, user._id, function(err) {
					
					if (err) {
						return res.json(500,err);
					}
					
					var newAccessToken = new AccessTokenModel({ 
	
						userId: user._id,

					 });
 
					newAccessToken.save(function (err, accessToken) {
					
						if (err) {
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
					
				})
		
		
			});
		})
		
	});
	
}

function deleteOldTokens(shouldDelete, userId, completion) {
	
	if (shouldDelete) {
		
		AccessTokenModel.find( { userId: userId }).remove(function(err) {
			completion(err);
		});
		
	} else {
		completion();
	}
	
}

function createTemporaryPasswordWithLength(length)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for( var i=0; i < length; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}