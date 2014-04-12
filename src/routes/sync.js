var UserModel = require('../models/user').model
var DeviceModel = require('../models/device').model;
var LinkModel = require('../models/link').model;
var GroupModel = require('../models/group').model;
var UserDeviceRelationshipModel = require('../models/userDeviceRelationship').model;

var passport = require('passport');
	
var async = require('async');
var mongoose = require('mongoose');

/////////////NOTE: device guids here are node _id


// export route event handlers
module.exports = function attachHandlers (router) {
    	
	// post requests
	router.post('/api/account/sync', passport.authenticate('bearer', { session: false }), syncWithTeacherUser);

};

function randomUniqueRegistrationToken(callback) {
	
	//Also in account.js 
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

function syncWithTeacherUser (req, res) {
	
	var lastUpdated = new Date(parseInt(req.body.lastUpdated, 10));

	var user = req.user;
	var usersDeviceToken = req.body.usersDeviceToken;
	var linksArray = req.body.links;
	var devicesArray = req.body.devices;
	var groupsArray = req.body.groups;
	var groupChangesArray = req.body.groupPlacementChanges;
	
	saveDeviceTokenForUser(usersDeviceToken, user, function(err) {
		
		saveLinksForUser(linksArray, user, function(err) {
				
			if (err) {
				return res.json(500, err);
			}
				
			saveDevicesForUser(devicesArray, user, function(err) {
				
				if (err) {
					return res.json(500, err);
				}
				
				saveGroupsForUser(groupsArray, user, function(err) {	
			
					if (err) {
						return res.json(500, err);
					}
																
					findObjectsModifiedAfterDateForUser(lastUpdated, user, function(err, dictionaryToSend) {
					
						var userDict = user.toObject();

						delete userDict['hashedPassword'];
						delete userDict['devices'];
						delete userDict['links'];
						delete userDict['groups'];
					
						dictionaryToSend.user = userDict;
					
						if (err) {
							return res.json(500, err);
						}
			
						return res.json(dictionaryToSend);
					});
			
				});
			});
		
		});
});
}

function savePlacementChangesForGroup(changeArray, group, callback) {
		
	var processChangeFunction = function(changeDictionary, innerCallback) {
		
		var guid = changeDictionary.guid;
		var deviceID = changeDictionary.deviceID;
		var placementType = changeDictionary.placementType; //0 == Added, 1 == Removed
		
		DeviceModel.findById(deviceID, function(err, device) {
			
			if (err) {
				innerCallback(err);
			}
			
			group.lastUpdated = new Date();
			device.lastUpdated = new Date();
			
			if (placementType == 0) {
				//Add to group
				group.devices.addToSet(device);
				device.groups.addToSet(group);
				
			} else {
				//Remove From Group
				var index = group.devices.indexOf(device._id);
				if (index != -1) {
					group.devices.splice(index, 1);
				}
				
				index = device.groups.indexOf(group._id);
				if (index != -1) {
					device.groups.splice(index, 1);
				}
			}
			
			group.save(function(err, savedGroup) {
									
				if (err) {
					return innerCallback(err);
				}
				
				device.save(function (err) {
					
					if (err) {
						return innerCallback(err);
					}
					
					innerCallback();
				});
				
			});
			
		});
		
	}
	
	async.eachSeries(changeArray, processChangeFunction, function(err){
				
		if (err) {
			return callback(err);
		}
		
		callback();

	});
}

function saveDeviceTokenForUser(deviceToken, user, callback) {
	
	user.update({ $addToSet: { usersDeviceTokens: deviceToken } }, function(err) {
	
		if (err) {						 
			return callback(err);
		}
		return callback();
	
	});
	
}

function saveGroupsForUser(groupsArray, user, callback) {
	
	var saveGroupsFunction = function(groupDictionary, callback) {
		
		var now = new Date();
		
		var groupInfo = groupDictionary.groupInfo;
		var groupPlacementChanges = groupDictionary.groupPlacementChanges;
		
		GroupModel.findOne( {guid: groupInfo.guid }, function(err, group) {
			
			if (err) {
				return callback(err);
			}
			
			if (group) {
							
				group.lastUpdated = now;
				group.name = groupInfo.name;
				group.hasBeenDeleted = groupInfo.hasBeenDeleted;
				
				group.save(function(err, group) {
					
					if (err) {
						return callback(err);
					}
						
					savePlacementChangesForGroup(groupPlacementChanges, group, function(err) {
				
						if (err) {
							return callback(err);
						}
					
						user.update({ $addToSet: { groups: group } }, function(err) {
						
							if (err) {						 
								return callback(err);
							}
							return callback();
						
						});
					
					});
					
				});
				
			} else {
				
				//Create the Group
				randomUniqueRegistrationToken(function(err, text) {
					
					if (err) {
						return callback(err);
					}
					
					var registrationToken = text;
				
					var newGroup = new GroupModel({ 
						user: user,
						name: groupInfo.name,
						guid: groupInfo.guid,
						lastUpdated: now,
						registrationToken: registrationToken
					});
				 				 				 
					newGroup.save(function(err, group) {
				 
						savePlacementChangesForGroup(groupPlacementChanges, group, function(err) {
					
								user.update({ $addToSet: { groups: group } }, function(err) {
						
									if (err) {						 
										return callback(err);
									}
									return callback();
						
								});
					
						
					
						});
					
					});
						
				});
							
			}
			
		});
		
		
	}
	
	async.eachSeries(groupsArray, saveGroupsFunction, function(err){
				
		if (err) {
			return callback(err);
		}
		
		callback();

	});
	
}

function saveDevicesForUser(devicesArray, user, callback) {
	
	var saveDevicesFunction = function(deviceDictionary, callback) {
		
		var now = new Date();
		var hasBeenDeleted = deviceDictionary.hasBeenDeleted;
		var deviceGUID = deviceDictionary.guid;
		var deviceName = deviceDictionary.name;
				
		var deviceObjectID = mongoose.Types.ObjectId(deviceGUID);
		
		UserDeviceRelationshipModel.findOne({ 'device': deviceObjectID, user: user }, function(err, relationship) {
			
			if (err) {
				return callback(err);
			}
			
			if (!relationship) {
				return callback();
			}
			
			relationship.deviceName = deviceName;
			relationship.hasBeenDeleted = hasBeenDeleted;
			relationship.lastUpdated = now;
			
			if (hasBeenDeleted) {
				
				removeDeviceObjectIDFromUsersGroups(deviceObjectID, user, function(err) {
					relationship.save(function(err) {
						if (err) {
							return callback(err);
						}
				
						return callback();
					});
				});
			} else {
				
	
			
			relationship.save(function(err) {
				if (err) {
					return callback(err);
				}
				
				callback();
			});
			
		}
			
		});
		
	};
	
	async.eachSeries(devicesArray, saveDevicesFunction, function(err){
				
		if (err) {
			return callback(err);
		}
		
		callback();

	});
	
}

function removeDeviceObjectIDFromUsersGroups(deviceObjectID, user, callback) {
	
	var removeDeviceFromGroupFunction = function(group, innerCallback) {
		
		var deviceIndex = group.devices.indexOf(deviceObjectID);
		if (deviceIndex != -1) {
			group.devices.splice(deviceIndex, 1);
			group.lastUpdated = new Date();
			
			group.save(function(err) {
			
				if (err) {
					return callback(err);
				}
				
				callback(err);
					
			});
			
		} else {
			callback();
		}
		
	};
	
	GroupModel.find({ devices: deviceObjectID, user: user }, function(err, groups) {
	
		async.eachSeries(groups, removeDeviceFromGroupFunction, function(err) {
			
			if (err) {
				return callback(err);
			}
			
			callback();
		})
		
	});
	
}

function saveLinksForUser(linksArray, user, callback) {
	
	var saveLinkFunction = function (linkDictionary, callback) {
		
		var now = new Date();

		LinkModel.findOne({ guid: linkDictionary.guid }, function(err, link) {
						
			if (err) {
				return callback(err);
			}
			
			if (link) {
										
				//Update the link
				link.user = user;
				link.url = linkDictionary.url;
				link.name = linkDictionary.name;
				link.savedByUser = linkDictionary.savedByUser;
				link.lastUpdated = now;
				link.hasBeenDeleted = linkDictionary.hasBeenDeleted;

				link.save(function(err, link) {
				
					if(err) {
						return callback(err);
					}
					
					user.update({ $addToSet: { links: link } }, function(err) {
				
						if (err) {						 
							return callback(err);
						}
						return callback();
					
					});
					
				});
				
			} else {
								
				//Create the link
				
				var newLink = new LinkModel({ 
					user: user,
					url: linkDictionary.url,
					name: linkDictionary.name,
					guid: linkDictionary.guid,
					savedByUser: linkDictionary.savedByUser,
					lastSentOn: linkDictionary.lastSendOn,
					lastUpdated: now
				});
				 				 
				newLink.save(function(err, link) {
				 						
					if (err) {						 
						return callback(err);
					}
				
					user.update({ $addToSet: { links: link } }, function(err) {
				
						if (err) {						 
							return callback(err);
						}
						return callback();
					
					});
						
				});
			}
			
			
		});
	};
	
	async.eachSeries(linksArray, saveLinkFunction, function(err){
				
		if (err) {
			return callback(err);
		}
		
		callback();

	});
	
}

function findObjectsModifiedAfterDateForUser(date, user, callback) {
	
	var dictionaryToReturn = { };
		
	LinkModel.find({ user: user, hasBeenDeleted: false, lastUpdated: { $gt: date } }, function(err, links) {
		
		if (err) {
			return callback(err, null);
		}
				
		dictionaryToReturn.links = links;
		
		UserDeviceRelationshipModel.find({ user: user, lastUpdated: { $gt: date } }).populate('device').exec(function(err, relationships) {
			
			if(err) {
				return callback(err, null);
			}
			
			dictionaryToReturn.devices = relationships;
		
			GroupModel.find({ user: user, lastUpdated: { $gt: date} }, function(err, groups) {
			
				if (err) {
					return callback(err, null);
				}
			
				dictionaryToReturn.groups = groups;
				callback(null, dictionaryToReturn);
			
			});
			
		});
		
	});
			
}
