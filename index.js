
var _ = require('lodash');
require('thor-lambda-microservice').create(__dirname);

var args = loader.lib('args');
var log = loader.lib('log');
var router = loader.controller('routes');
var settings = loader.lib('settings');
var slack = loader.lib('slack');

exports.handler = function(e, ctx, cb) {
	log.json('Event', e, ctx);

	if(_.get(e, 'httpMethod')) {
		return router.run(e, ctx, cb);
	}

	log.json('Unhandled event type', e);
	cb();
};

loader.lib('cli');
