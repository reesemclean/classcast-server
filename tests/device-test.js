var request = require('request'),
vows = require('vows'),
assert = require('assert');
	
var hostName = 'http://localhost:3000/api'

var userId;
var token;
var deviceToken = '<c827d321 cce56350 32891238 9d804969 5f85faf6 a9024a14 d6c96ac2 c827492d>'
var registrationToken;
var guid = 'ipadGUID';
var startDate = new Date();

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
				var result = JSON.parse(body);
				token = result.token;
				registrationToken = result.user.registrationToken;
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"A post to /api/registerDevice": {
			topic: function () {
				request({
					uri: hostName + '/device/registerToUser',
					method: 'POST',
					body: JSON.stringify({ 	registrationToken: registrationToken,
					 						deviceToken: deviceToken,
											deviceName: 'Test iPad',
											guid: guid }),
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer '+token
					}
				}, this.callback)
			},
			"should respond with 200": function (err, res, body) {
				assert.equal(res.statusCode, 200);
			},
			"should respond with the same user": function (err, res, body) {
				var result = JSON.parse(body);
				assert.equal(userId, result.user._id);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"The device comes when updating user": {
			topic: function () {
				request({
					uri: hostName + '/account',
					method: 'GET',
					body: JSON.stringify({ updatesSince: startDate }),
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer '+token
					}
				}, this.callback)
			},
			"should respond with 200": function (err, res, body) {
				assert.equal(res.statusCode, 200);
			},
			"should respond with device in list": function (err, res, body) {
				var result = JSON.parse(body);
				var found = false;
						
				for (var i = 0, len = result.updatedDevices.length; i < len; i++) {
					if (result.updatedDevices[i].guid === guid) {
						found = true;
						i = len;
					}
				}
				
				assert.equal(found, true);
			}
		}
	}
}).addBatch({
	"When using the api": {			
		"A post to /api/registerDevice with bad registration token": {
			topic: function () {
				request({
					uri: hostName + '/device/registerToUser',
					method: 'POST',
					body: JSON.stringify({ 	registrationToken: 'invalid token',
					 						deviceToken: deviceToken,
											deviceName: 'Test iPad',
											guid: guid }),
					headers: {
						'Content-Type': 'application/json',
						'Authorization': 'Bearer '+token
					}
				}, this.callback)
			},
			"should respond with 404": function (err, res, body) {
				assert.equal(res.statusCode, 404);
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
}).export(module);