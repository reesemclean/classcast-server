exports.attachHandlers = function attachHandlers (app) {
    
	require('./account')(app);
	require('./auth')(app);
	require('./device')(app);
	require('./sendLink')(app);
	require('./sync')(app);
	require('./verify_iap')(app);
};