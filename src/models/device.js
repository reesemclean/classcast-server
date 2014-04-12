var mongoose = require('mongoose');

var db = require('../database').connection;

var schema = mongoose.Schema({
	guid: String,
	lastUpdated: Date,
	deviceToken: String,
	name: String,
	deviceType: Number,
	deviceRelationships: [{ 
		type: mongoose.Schema.Types.ObjectId, 
      	ref: 'DeviceRelationship'
	}],
	groups: [{
    	type: mongoose.Schema.Types.ObjectId, 
      	ref: 'Group'
	}]
});

module.exports.schema = schema;
module.exports.model = db.model('Device', schema);