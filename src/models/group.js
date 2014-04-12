var mongoose = require('mongoose');

var db = require('../database').connection;

var schema = mongoose.Schema({
	guid: String,
	lastUpdated: Date,
	hasBeenDeleted: { type: Boolean, default: false },
	name: String,
	user: {
  	  type: mongoose.Schema.Types.ObjectId, 
  	  ref: 'User'
  	},
	registrationToken: String,
	devices: [{
  	  type: mongoose.Schema.Types.ObjectId, 
  	  ref: 'Device'
  	}]
});

module.exports.schema = schema;
module.exports.model = db.model('Group', schema);
