var request = require('request'),
vows = require('vows'),
assert = require('assert');
	
var hostName = 'http://localhost:3000/api'

var userId;
var token;

vows.describe('api').addBatch({
	"When using the api": {			
		"A POST to /api/account": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'POST',
					body: JSON.stringify({ displayName: 'Mr. McLean', emailAddress: 'test@me.com', password: "secret" }),
					headers: {
						'Content-Type': 'application/json'
					}
				}, this.callback)
			},
			"should respond with 200": function (err, res, body) {
				var result = JSON.parse(body);
				assert.equal(res.statusCode, 200);
				userId = result.user._id;
			},
			"should respond with a token": function (err, res, body) {
				var result = JSON.parse(body);
				assert.notEqual(result.token, null);
			},
			"should not send password": function (err, res, body) {
				var result = JSON.parse(body);
				assert.equal(result.user.hashedPassword, null);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"When creating a user": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'POST',
					body: JSON.stringify({ displayName: 'Mr. McLean', emailAddress: 'test@me.com', password: "another secret" }),
					headers: {
						'Content-Type': 'application/json'
					}
				}, this.callback)
			},
			"should respond with 409, duplicate resources": function (err, res, body) {
				assert.equal(res.statusCode, 409);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"Get a token using proper credentials": {
			topic: function () {
				request({
					uri: hostName + '/auth/token',
					method: 'POST',
					body: JSON.stringify({ }),
					headers: {
						'Content-Type': 'application/json'
					},
					auth: { user: 'test@me.com', password: 'secret' }
				}, this.callback)
			},
			"should respond with 200": function (err, res, body) {
				assert.equal(res.statusCode, 200);
			},
			"should respond with a token": function (err, res, body) {
				var result = JSON.parse(body);
				token = result.token;
				assert.notEqual(token, null);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"A Get to /api/account": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'GET',
					body: JSON.stringify({ }),
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer '+token
					}
				}, this.callback)
			},
			"should respond with 200": function (err, res, body) {
				var result = JSON.parse(body);
				assert.equal(res.statusCode, 200);
			},
			"email should match": function (err, res, body) {
				var result = JSON.parse(body);
				assert.equal('reese.mclean@me.com', result.user.emailAddress);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"A Get to /api/account with improper credentials": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'GET',
					body: JSON.stringify({ }),
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer ' + 'incorrect token'
					}
				}, this.callback)
			},
			"should respond with 400": function (err, res, body) {
				assert.equal(res.statusCode, 400);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"A Get to /api/account with no token": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'GET',
					body: JSON.stringify({ }),
					headers: {
						'Content-Type': 'application/json'
					}
				}, this.callback)
			},
			"should respond with 401": function (err, res, body) {
				assert.equal(res.statusCode, 401);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"A Delete to /api/account": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'DELETE',
					body: JSON.stringify({ }),
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer '+token
					}
				}, this.callback)
			},
			"should respond with 200": function (err, res, body) {
				assert.equal(res.statusCode, 200);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"After delete, the user is actually deleted": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'GET',
					body: JSON.stringify({ }),
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer '+token
					}
				}, this.callback)
			},
			"should respond with 401": function (err, res, body) {
				assert.equal(res.statusCode, 401);
			}
		}
	}
}).export(module);