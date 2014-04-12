
var config = require('../config')
var mongoose = require('mongoose')
  , connection = mongoose.createConnection(config.database.connectionPath);
 
connection.on('error', function (err) {
  console.log(err)
})
 
module.exports.connection = connection;