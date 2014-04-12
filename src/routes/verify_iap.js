var UserModel = require('../models/user').model;

var passport = require('passport');
	
var IAPVerifier = require('iap_verifier');
var config = require('../../config');


var moment = require('moment');

// export route event handlers
module.exports = function attachHandlers (router) {
    	
	// post requests
	router.post('/api/account/verify_iap', passport.authenticate('bearer', { session: false }), verify);

};

function verify(req, res) {
	
	// Verify a receipt
	var user = req.user;
	var receipt = req.body.receipt;

    var encodedReceipt = new Buffer(receipt.replace(/[^0-9a-f]/gi, ""), "hex");

	var client = new IAPVerifier(config.iap.secret);

	client.verifyReceipt(encodedReceipt, function(valid, msg, data) {
	  if (valid) {
	    // update status of payment in your system
		var receipt = data.receipt;
		
		var numberOfMonthsToAdd = 0
		if (receipt.product_id == config.iap.OneMonthProductKey) {
			numberOfMonthsToAdd = 1;
		} else if (receipt.product_id == config.iap.OneYearProductKey) {
			numberOfMonthsToAdd = 12;
		}
		
		var currentExpirationDate = user.subscriptionExpirationDate;
		if (!currentExpirationDate) {
			currentExpirationDate = new Date();
		}
		
		var momentWrapper = moment(currentExpirationDate);
		momentWrapper.add('months', numberOfMonthsToAdd);
		
		user.subscriptionExpirationDate = momentWrapper.toDate();
		user.save(function(err) {
			
			if (err) {
				return res.json(500, err);
			}
			
			var userDict = user.toObject();

			delete userDict['hashedPassword'];
		
			res.json(userDict);
			
		})
		
	  } else {
	    console.log("Invalid receipt");
		
		if (err) {
			return res.json(401, new Error("Invalid Receipt"));
		}
		
	  }
	});
	
}