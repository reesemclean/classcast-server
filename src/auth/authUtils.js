var bcrypt = require('bcrypt');

exports.hashPassword = function (password, callback) {
	
	bcrypt.hash(password, 10, function(err, hash) {
		
		if (err) {
			return callback(err, null);
		}
		
		callback(null, hash);
		
	});
	
}

exports.verifyPassword = function (candidate, hash, callback) {
	
	bcrypt.compare(candidate, hash, function(err, res) {

		if (err) {
			return callback(err, null);
		}
		
		callback(null, res);
		
	});
}