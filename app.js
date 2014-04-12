var express = require('express')
  , http = require('http')
  , path = require('path')
  , passport = require('passport');

var app = express();
var config = require('./config');

function restrictVersion() {
		
    return function restrictVersion(req, res, next) {
		var clientVersion = parseInt(req.get('API-Version'), 10);
		var requiredVersion = parseInt(config.requiredVersion, 10);
		if (clientVersion < requiredVersion) {
			return res.json(406, new Error("Need to upgrade client"));
		}
	
      	next();
    }

}

app.configure(function(){
  app.set('port', config.web.port);
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(passport.initialize());
  app.use(restrictVersion());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

var routes = require('./src/routes');
routes.attachHandlers(app);

require('./src/auth/auth');

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

