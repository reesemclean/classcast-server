var authUtils = require('./authUtils');

var 	passport = require('passport')
, 	BasicStrategy = require('passport-http').BasicStrategy
, 	BearerStrategy = require('passport-http-bearer').Strategy;

var UserModel = require('../models/user').model,
AccessTokenModel = require('../models/accessToken').model;

passport.use(new BasicStrategy({},
	function(email, password, done) {
				
		UserModel.findOne({emailAddress: email}, function(err, user) {
				
			if (err) { 
				return done(err); 
			}
	  
			if (!user) { 
				return done(null, false); 
			}
	  
			authUtils.verifyPassword(password, user.hashedPassword, function (err, result) {
		  
				if (err) {
					return done(err);
				}
		  
				if (!result) {
					return done(null, false); 
				}
		  
				return done(null, user);
		  
			});
	  
		});
	}
));

// Use the BearerStrategy within Passport.
//   Strategies in Passport require a `validate` function, which accept
//   credentials (in this case, a token), and invoke a callback with a user
//   object.
passport.use(new BearerStrategy({},
	function(token, done) {
      	  		  
		// Find the user by token.  If there is no user with the given token, set
		// the user to `false` to indicate failure.  Otherwise, return the
		// authenticated `user`.  Note that in a production-ready application, one
		// would want to validate the token for authenticity.
		AccessTokenModel.findById(token, function(err, tokenModel) {
	  									
			if (err) {
				return done(err);
			}
		  
			if (!tokenModel) {
				return done(null, false);
			}
		  		  	
			UserModel.findById(tokenModel.userId, function(err, user) {				
			
				if (err) {
					return done(err);
				}
			  
				if (!user) {
					return done(null, false);
				}
			
				return done(null, user);
			
			});
	
		});
	}
));
