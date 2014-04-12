var mongoose = require('mongoose');

var db = require('../database').connection;
var userDeviceRelationshipSchema = require('./userDeviceRelationship').schema; 

var schema = mongoose.Schema({
	subscriptionExpirationDate: Date,
	lastUpdated: Date,
	displayName: String,
	emailAddress: String,
    hashedPassword: String,
	resetPasswordToken: String,
	resetPasswordExpireDate: Date,
	registrationToken: String,
	usersDeviceTokens: [String],
	deviceRelationships: [{ 
		type: mongoose.Schema.Types.ObjectId, 
      	ref: 'DeviceRelationship'
	}],
	groups: [{
  	  type: mongoose.Schema.Types.ObjectId, 
  	  ref: 'Group'
  	}],
	links: [{
  	  type: mongoose.Schema.Types.ObjectId, 
  	  ref: 'Link'
  	}]
});

module.exports.schema = schema;
module.exports.model = db.model('User', schema);