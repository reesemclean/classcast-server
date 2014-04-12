var request = require('request'),
vows = require('vows'),
assert = require('assert');

var config = require('../config');
	
var hostName = 'http://localhost:3000/api'

var userId;
var token;
var resetPasswordToken;

vows.describe('api').addBatch({
	"When using the api": {			
		"A POST to /api/teachers": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'POST',
					body: JSON.stringify({ displayName: 'Mr. McLean', emailAddress: config.support.email, password: "secret" }),
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
					auth: { user: config.support.email, password: 'secret' }
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
		"Don't get a token with wrong password": {
			topic: function () {
				request({
					uri: hostName + '/auth/token',
					method: 'POST',
					body: JSON.stringify({ }),
					headers: {
						'Content-Type': 'application/json'
					},
					auth: { user: config.support.email, password: 'notthesecret' }
				}, this.callback)
			},
			"should respond with 401": function (err, res, body) {
				assert.equal(res.statusCode, 401);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"Don't get a token with unknown username": {
			topic: function () {
				request({
					uri: hostName + '/auth/token',
					method: 'POST',
					body: JSON.stringify({ }),
					headers: {
						'Content-Type': 'application/json'
					},
					auth: { user: 'nottest@me.com', password: 'secret' }
				}, this.callback)
			},
			"should respond with 401": function (err, res, body) {
				assert.equal(res.statusCode, 401);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"Password Reset": {
			topic: function () {
				request({
					uri: hostName + '/auth/forgot',
					method: 'POST',
					body: JSON.stringify({ emailAddress: config.support.email }),
					headers: {
						'Content-Type': 'application/json'
					}
				}, this.callback)
			},
			"should respond with 200": function (err, res, body) {
				var result = JSON.parse(body);
				resetPasswordToken = result.resetPasswordToken;
				assert.equal(res.statusCode, 200);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"Change Password with temporary password token": {
			topic: function () {
				request({
					uri: hostName + '/auth/reset',
					method: 'POST',
					body: JSON.stringify({ emailAddress: config.support.email, newPassword: 'newPassword', resetPasswordToken: resetPasswordToken, shouldDeleteOldTokens: true }),
					headers: {
						'Content-Type': 'application/json'
					}
				}, this.callback)
			},
			"should respond with 200": function (err, res, body) {
				var result = JSON.parse(body);
				assert.equal(res.statusCode, 200);
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
					auth: { user: config.support.email, password: 'newPassword' }
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
		"A Delete to /api/teachers/knownId": {
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
}).export(module);