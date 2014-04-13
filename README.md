#ClassCast-Server

ClassCast-Server glues the teacher and student ClassCast clients together. ClassCast-Server tracks the relationship between teacher accounts and students devices. When a teacher selects a link to share, the server sends these as push notifications to the selected students devices. It also handles subscriptions and verifying in app purchases.

##Getting Started


###Dependencies

ClassCast-Server is written in Node.js. Please make sure Node.js and npm are installed.

From the ClassCast-Server directory, install dependencies using:

$ npm install

###Configuration

Edit config.js:

* Key for Mandrill from http://mandrill.com for reset emails.
* Support Email Address
* Password Reset Email Address
* iOS in App Purchase Secret Key
* Product Ids for 1 Year and 1 Month Subscriptions.
* Database Connection Path

### APN Certs

You will need to add Apple Push Notification Certificates for both Development and Production.

In each folder add the certificates and keys generated from the Development/Production SSL certificate you get from Apple's iOS Dev Center.

There should be 4 files in each folder. They need to be named as follows:

* cert-classcast.pem
* cert-classcatcher.pem
* key-classcast.pem
* key-classcatcher.pem

See https://github.com/argon/node-apn/wiki/Preparing-Certificates as a guide to preparing the keys and certificates.