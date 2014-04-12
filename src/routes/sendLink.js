var UserModel = require('../models/user').model
var DeviceModel = require('../models/device').model;
var LinkModel = require('../models/link').model;
var GroupModel = require('../models/group').model;

var passport = require('passport');
	
var config = require('../../config');
	
var apn = require('apn');
var apnConnection = new apn.Connection({ gateway: config.apn.gateway,
										     key: config.apn.studentKeyName,
					     					cert: config.apn.studentCertName,
							   connectionTimeout: 1000 * 60 * 10 }); //10 minutes
											
var async = require('async');

var mongoose = require('mongoose');

// export route event handlers
module.exports = function attachHandlers (router) {
    	
	// post requests	
	router.post('/api/account/sendLink', passport.authenticate('bearer', { session: false }), sendLink);
	
};

apnConnection.on('connected', function() {
    console.log("Connected");
});

apnConnection.on('transmissionError', function(errCode, notification, device) {
    console.error("Notification caused error: " + errCode + " for device ", device, notification);
});

apnConnection.on('timeout', function () {
    console.log("Connection Timeout");
});

apnConnection.on('disconnected', function() {
    console.log("Disconnected from APNS");
});

apnConnection.on('socketError', console.error);

function sendLink (req, res) {
			
	var user = req.user;
	var deviceGUIDs = req.body.deviceGUIDs;
	var linkDictionary = req.body.link;
		
	//Find or create link here
	LinkModel.findOne({ guid: linkDictionary.guid }, function(err, link) {
					
		if (err) {
			return callback(err);
		}
		
		if (!link) {
			link = new LinkModel();
			link.user = user;
			link.guid = linkDictionary.guid;
		}
		
		link.url = linkDictionary.url;
		link.name = linkDictionary.name;
		link.savedByUser = linkDictionary.savedByUser;
		link.lastUpdated = new Date();
		link.hasBeenDeleted = linkDictionary.hasBeenDeleted;
		link.lastSentOn = new Date();
		
		for( var i = 0; i < deviceGUIDs.length; i++) {
			link.devicesSentTo.addToSet(deviceGUIDs[i]);
		}
				
		link.save(function(err, link) {
				
			if(err) {
				return res.json(500, err);
			}
			
			user.update({ $addToSet: { links: link } }, function(err) {
		
				if (err) {						 
					return res.json(500, err);
				}

				findDevicesAndSendLink(link, deviceGUIDs, function(err, devices) {
										
					if (err) {						 
						return res.json(500, err);
					}
										
					return res.json(devices);
				})
			
			});
		
		});
		
	});

}

function findDevicesAndSendLink(link, deviceGUIDs, callback) {
	
	DeviceModel.find({ _id : { $in: deviceGUIDs }}, function(err, devices) {

		if (err) {
			callback(err, null);
		}

		sendLinkToDevices(link, devices, function(err) {

			if (err) {
				callback(err, null);
			}

			callback(null, devices);

		});

	});
	
}

function sendLinkToDevices(link, devices, callback) {
	
	var note = new apn.Notification();
	note.expiry = Math.floor(Date.now() / 1000) + 60*60*10; // Expires 10 hours from now.
	note.sound = "ping.aiff";
	note.alert = "Your teacher sent you a link!";
	
	note.payload = {'linkUrl': link.url, 'linkName': link.name, 'linkGUID': link.guid, 'teacherGUID': link.user, 'lastSentOn': link.lastSentOn };
	
	trimPayloadIfNeeded(note, function(trimmedNotification) {
		
		var deviceTokens = new Array();
		for (var i = 0; i < devices.length; i++) {
			deviceTokens.push(devices[i].deviceToken);
		}
		
		apnConnection.pushNotification(trimmedNotification, deviceTokens);
	
		callback();
		
	});
	
}

function trimPayloadIfNeeded(rawNotification, callback) {
	
	var trimmedNotification = rawNotification;
		
	if (trimmedNotification.length() > 256.0) {
		delete trimmedNotification.payload["lastSentOn"];
	}
	
	if (trimmedNotification.length() > 256.0) {
		delete trimmedNotification.payload["linkName"];
	}
	
	if (trimmedNotification.length() > 256.0) {
		delete trimmedNotification.payload["teacherGUID"];
	}
	
	if (trimmedNotification.length() > 256.0) {
		console.log('Notification too long')
	}
	
	callback(trimmedNotification);
	
}
