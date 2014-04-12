var mongoose = require('mongoose');

var db = require('../database').connection;

var schema = mongoose.Schema({
	deviceName: String,
	hasBeenDeleted: { type: Boolean, default: false },
	lastUpdated: Date,
	device: {
  	  type: mongoose.Schema.Types.ObjectId, 
  	  ref: 'Device'
  	},
	user: {
  	  type: mongoose.Schema.Types.ObjectId, 
  	  ref: 'User'
  	}
});

module.exports.schema = schema;
module.exports.model = db.model('UserDeviceRelationship', schema);