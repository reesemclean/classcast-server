//This file needs to be renamed to config.js
//Once information is added it should not be committed to public source control

var config = {};

config.support = {};
config.support.email = ''

config.passwordReset = {};
config.passwordReset.URLScheme = 'classcast://resetpassword' //A url scheme for iOS app
config.passwordReset.email = ''

config.database = {};
config.database.connectionPath = ''

config.web = {};
config.web.port = 3000;

config.mandrill = {};
config.mandrill.key = '';

config.apn = {};

//var folderLocation = process.cwd() + '/apn_certs/production/'; //Production
var folderLocation = process.cwd() + '/apn_certs/development/'; //Development
config.apn.gateway = "gateway.push.apple.com";

config.apn.teacherCertName = folderLocation + 'cert-classcast.pem';
config.apn.teacherKeyName = folderLocation + 'key-classcast.pem';
config.apn.studentCertName = folderLocation + 'cert-classcatcher.pem';
config.apn.studentKeyName = folderLocation + 'key-classcatcher.pem';

config.iap = {};
config.iap.secret = '';
config.iap.OneMonthProductKey = "";
config.iap.OneYearProductKey = "";

config.requiredVersion = 1.0;

module.exports = config;