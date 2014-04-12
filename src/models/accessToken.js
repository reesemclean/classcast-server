var mongoose = require('mongoose');

var db = require('../database').connection;

var schema = mongoose.Schema({
	userId: String
});

module.exports.schema = schema;
module.exports.model = db.model('AccessToken', schema);