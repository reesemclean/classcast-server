var mongoose = require('mongoose');

var db = require('../database').connection;

var schema = mongoose.Schema({
	guid: String,
	lastUpdated: Date,
	hasBeenDeleted: { type: Boolean, default: false },
	name: String,
	url: String,
	savedByUser: Boolean,
	lastSentOn: Date,
	user: {
  		type: mongoose.Schema.Types.ObjectId, 
  	  	ref: 'User'
  	},
	devicesSentTo: [{
    	type: mongoose.Schema.Types.ObjectId, 
    	ref: 'DevicesSentTo'
	}]
});

module.exports.schema = schema;
module.exports.model = db.model('Link', schema);