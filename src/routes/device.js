var UserModel = require('../models/user').model;
var GroupModel = require('../models/group').model;
var DeviceModel = require('../models/device').model;
var LinkModel = require('../models/link').model;
var UserDeviceRelationshipModel = require('../models/userDeviceRelationship').model;

var passport = require('passport');

var apn = require('apn');

var config = require('../../config');

var options = { "gateway": config.apn.gateway, 
key: config.apn.teacherKeyName,
cert: config.apn.teacherCertName,
connectionTimeout: 1000 * 60 * 10 }; //10 Minutes
			 
var apnConnection = new apn.Connection(options);

// export route event handlers
module.exports = function attachHandlers (router) {
    
	router.post('/api/device/registerToUser', registerDeviceToUser);
	router.post('/api/device/sync', syncDevice);
};

function syncDevice(req, res) {
	
	console.log('Syncing Device');
	
	var lastUpdated = new Date(parseInt(req.body.lastUpdated, 10));
	
	var deviceDictionary = req.body.device;
	
	console.log('Device Token: ' + deviceDictionary.deviceToken);
	
	DeviceModel.findOne({ guid: deviceDictionary.guid }, function(err, device) {
		
		if (err) {
			return res.json(500,err);
		}
						
		if (!device) {
			console.log('Creating Device with GUID: ' + deviceDictionary.guid);
			device = new DeviceModel();
			device.guid = deviceDictionary.guid;
		}
		
		console.log('Device: ' + device);
		
		if (deviceDictionary.deviceToken) {
			device.deviceToken = deviceDictionary.deviceToken;
		}
		
		if (deviceDictionary.deviceType) {
			device.deviceType = deviceDictionary.deviceType;
		}
		
		device.lastUpdated = new Date();
		
		console.log('Device After Sync: ' + device);
				
		device.save(function(err) {
			
			if (err) {
				console.log('Save Error');
				return res.json(500,err);
			}
			
			console.log('Device After Save: ' + device);
			
			findObjectsModifiedAfterDateForDevice(lastUpdated, device, function(err, dictionaryToSend) {
				
				if (err) {
					console.log('Find Error');
					return res.json(500,err);
				}
				
				res.json(dictionaryToSend);	
				
			});
			
		});
		
	});
	
}

function findObjectsModifiedAfterDateForDevice(date, device, callback) {	
	
	var dictionaryToSend = {};
		
	UserDeviceRelationshipModel.find({ device: device }).populate('user').exec(function(err, relationships) {
				
		if (err) {
			return callback(err, null);
		}
		
		var usersDictionarysToSendArray = new Array();
		var notDeletedUserModels = new Array();
		
		for (var i = 0; i < relationships.length; i++) {
			
			var relationship = relationships[i];
			var user = relationship.user;
			var userDict = userDictionaryForUserAndRelationship(user, relationship);
			
			usersDictionarysToSendArray.push(userDict);
			
			if (!relationship.hasBeenDeleted) {
				notDeletedUserModels.push(user);
			}
			
		}
		
		dictionaryToSend.teachers = usersDictionarysToSendArray;
				
		//Find links for undeleted relationships since the lastUpdated date
		LinkModel.find( { user: { $in : notDeletedUserModels }, devicesSentTo: device, lastUpdated: { $gt: date } }, function(err, links) {
								
			if (err) {
				return callback(err, null);
			}
			
			dictionaryToSend.links = links;
			callback(null, dictionaryToSend);
		});
	});
			
}

function userDictionaryForUserAndRelationship (user, relationship) {
	
	var userDict = { guid: user._id, hasBeenDeleted: relationship.hasBeenDeleted };
	if (user.displayName) {
		userDict.displayName = user.displayName;
	} else {
		userDict.displayName = user.emailAddress;
	}
	
	return userDict;
	
}

function registerDeviceToUser(req, res) {
		
	var registrationToken = req.body.registrationCode;
	var deviceToken = req.body.deviceToken;
	var deviceName = req.body.deviceName;
	var guid = req.body.guid;
	
	if (!deviceName) {
		deviceName = 'Device';
	}
	
	console.log('Reg Token: ' + registrationToken);
	console.log('Device Token: ' + deviceToken);
	console.log('Device Name: ' + deviceName);
	console.log('Device GUID: ' + guid);
	
	if (!registrationToken || !deviceName || !guid ) {
		//TODO Whats the right error code?
		
		console.log('Missing Parameters registering Device to user');
		return res.json(500, new Error("Missing Parameters"));
		
	}

	var now = new Date();

	//Check if any users have this registration token
	UserModel.findOne( { registrationToken: registrationToken }, function(err, user) {
				
		if (err) {
			console.log('Error finding user');
			return res.json(500,err);
		}
		
		if (user) {
			
			console.log('Found User: ' + user);
			
			DeviceModel.findOne( { guid: guid }, function(err, device) {
		
				if (err) {
					console.log('Error finding device');
					return res.json(500,err);
				}
		
				if (!device) {
					console.log('Could not find device');
					return res.json(401, err);
				}
				
				setupDeviceRelationshipWithUserAndDeviceAndDeviceName(user, device, deviceName, function(err, errCode, relationship) {
				
					if (errCode < 300) {
						sendDeviceAddedNotificationToUser(device, user);
						return res.json(errCode, { status: 'Added' });
					} else {
					
						return res.json(errCode, err);
					
					}
				
				});
			});
			
		} else {
			
			GroupModel.findOne( { registrationToken: registrationToken }).populate('user').exec(function(err, group) {
				
				if (err) {
					console.log('Error finding Group');
					return res.json(500,err);
				}
				
				if (!group) {
					console.log('Could not find group.');
					return res.json(404, err);
				}
				
				DeviceModel.findOne( { guid: guid }, function(err, device) {
		
					if (err) {
						console.log('Error finding device.');
						return res.json(500,err);
					}
		
					if (!device) {
						console.log('Could not find device.');
						return res.json(401, err);
					}
				
					console.log('Groups User: ' + group.user);
				
					setupDeviceRelationshipWithUserAndDeviceAndDeviceName(group.user, device, deviceName, function(err, errCode, relationship) {
				
						if (errCode < 300) {
							
							group.devices.addToSet(device);
							group.lastUpdated = new Date();
							group.save(function(err) {
								
								if (err) {
									return res.json(500, err);
								}
								
								sendDeviceAddedNotificationToUser(device, group.user);
								console.log('Added device');
								return res.json(errCode, { status: 'Added' });
								
							});
							
						} else {
					
							console.log('Problem adding device');
							return res.json(errCode, err);
					
						}
				
					});
				});
				
			});
			
		}
	});
}

function setupDeviceRelationshipWithUserAndDeviceAndDeviceName(user, device, deviceName, callback) {
	
	console.log('Setting up device relationship');
	
	UserDeviceRelationshipModel.findOne( { device: device, user: user }, function(err, userDeviceRelationship) {
	
		if (err) {
			console.log('Error: ' + err);
			return callback(err, 500, null);
		}
	
		if (userDeviceRelationship) {
		
			console.log('Updating Relationship');
			//Update relationship and device
			if (userDeviceRelationship.hasBeenDeleted) {
				userDeviceRelationship.hasBeenDeleted = false;
				userDeviceRelationship.lastUpdated = new Date();
				userDeviceRelationship.deviceName = deviceName;
			
				userDeviceRelationship.save(function(err) {
					if (err) {
						return callback(err, 500, null);
					}
				
					return callback(null, 200, userDeviceRelationship);
				})
			
			} else {
				return callback(null, 409, userDeviceRelationship);
			}

		} else {
			//create relationship
		
			console.log('Creating Relationship');
		
			if (!device) {
				console.log('No device');
				return callback(null, 401, null);
			}

			var relationship = new UserDeviceRelationshipModel();
			relationship.device = device;
			relationship.user = user;
			relationship.lastUpdated = new Date();
			relationship.deviceName = deviceName;
			
			console.log("Relationship: " + relationship);
			
			relationship.save(function(err) {
				
				if (err) {
					return callback(err, 500, null);
				}
				
				console.log("Saved Relationship: " + relationship);
				
				device.update({ $addToSet: { deviceRelationships: relationship } }, function(err) {
				
					if (err) {
						return callback(err, 500, null);
					}
					
					console.log("Added Relationship to device: " + device);
					
					user.update({ $addToSet: { deviceRelationships: relationship } }, function(err) {
					
						if (err) {
							return callback(err, 500, null);
						}
						
						console.log("Added Relationship to user: " + device);
										
						return callback(null, 201, relationship);
					});
				});
			});
		}
	});
}

function sendDeviceAddedNotificationToUser(deviceAdded, user) {
	
	if (!user.usersDeviceTokens || user.usersDeviceTokens.length < 1) {
		return;
	}
	
	var note = new apn.Notification();
	note.expiry = Math.floor(Date.now() / 1000) + 60*60; // Expires 1 hours from now.
	
	apnConnection.pushNotification(note, user.usersDeviceTokens);
	
}

// function removeDeviceFromGroup(req, res) {
	// 	
	// 	var groupId = req.body.groupId;
	// 	var deviceId = req.body.deviceId;
	// 	
	// 	GroupModel.findById(groupId, function(err, group) {
		// 
		// 		if (err) {
			// 			device.groups
			// 			return res.json(500,err);
			// 		}
			// 
			// 		if (!group) {
				// 			return res.json(404, err);
				// 		}
				// 		
				// 		DeviceModel.findById(deviceId, function(err, device) {
					// 		
					// 			if (err) {
						// 				return res.json(500,err);
						// 			}
						// 		
						// 			if (!group) {
							// 				return res.json(404, err);
							// 			}
							// 			
							// 			var groupIndex = device.groups.indexOf(groupId);
							// 			device.groups.splice(groupIndex, 1);
							// 			
							// 			device.save(function(err) {
								// 			
								// 				if (err) {
									// 					return res.json(500,err);
									// 				}
									// 			
									// 				var deviceIndex = group.devices.indexOf(deviceId);
									// 				group.devices.splice(deviceIndex, 1);
									// 				group.save(function(err) {
										// 					
										// 					if (err) {
											// 						return res.json(500,err);
											// 					}
											// 										
											// 					res.json(200);
											// 				})
											// 			
											// 			});
											// 			
											// 		});
											// 
											// 	});	
											// 	
											// }
											// 
											// function addDeviceToGroup(req, res) {
												// 
												// 	var groupId = req.body.groupId;
												// 	var deviceId = req.body.deviceId;
												// 	
												// 	GroupModel.findById(groupId, function(err, group) {
													// 
													// 		if (err) {
														// 			device.groups
														// 			return res.json(500,err);
														// 		}
														// 
														// 		if (!group) {
															// 			return res.json(404, err);
															// 		}
															// 		
															// 		DeviceModel.findById(deviceId, function(err, device) {
																// 		
																// 			if (err) {
																	// 				return res.json(500,err);
																	// 			}
																	// 		
																	// 			if (!group) {
																		// 				return res.json(404, err);
																		// 			}
																		// 			
																		// 			device.groups.push(groupId);
																		// 			device.save(function(err) {
																			// 			
																			// 				if (err) {
																				// 					return res.json(500,err);
																				// 				}
																				// 			
																				// 				group.devices.push(deviceId);
																				// 				group.save(function(err) {
																					// 					
																					// 					if (err) {
																						// 						return res.json(500,err);
																						// 					}
																						// 					
																						// 					var dict = { group: group, device: device };
																						// 					
																						// 					res.json(dict);
																						// 				})
																						// 			
																						// 			});
																						// 			
																						// 		});
																						// 
																						// 	});	
																						// 	
																						// }
																						// 
																						// function removeDevice(req, res) {
																							// 	
																							// 	var deviceId = req.params.deviceId;
																							// 	DeviceModel.findById(deviceId).populate('groups').populate('user').exec(function(err, device) {
																								// 		
																								// 		if (err) {
																									// 			return res.json(500,err);
																									// 		}
																									// 	
																									// 		if (!group) {
																										// 			return res.json(404, err);
																										// 		}
																										// 		
																										// 		removeDeviceFromGroups(device, device.groups, function(err) {
																											// 			
																											// 			if (err) {
																												// 				return res.json(500,err);
																												// 			}
																												// 			
																												// 			var user = device.user;
																												// 			var deviceIndex = user.devices.indexOf(device._id);
																												// 			user.devices.splice(deviceIndex, 1);
																												// 			user.save(function(err) {
																													// 				
																													// 				if (err) {
																														// 					return res.json(500,err);
																														// 				}
																														// 				
																														// 				res.json(200);
																														// 			})
																														// 			
																														// 		});
																														// 
																														// 	})
																														// 	
																														// }
																														// 
																														// function removeDeviceFromGroups(device, groups, callback) {
																															// 	
																															// 	var err = NULL
																															// 	var count = groups.length;
																															// 	for (var group in groups) {
																																// 	
																																// 		var deviceIndex = group.devices.indexOf(device._id);
																																// 		group.devices.splice(deviceIndex, 1);
																																// 		group.save(function(innerErr) {
																																	// 			
																																	// 			if (innerErr) {
																																		// 				err = innerErr;
																																		// 			}
																																		// 			
																																		// 			count--;
																																		// 			if (count == 0) {
																																			// 				callback(err);
																																			// 			}
																																			// 			
																																			// 		})
																																			// 		
																																			// 	}
																																			// 	
																																			// }


