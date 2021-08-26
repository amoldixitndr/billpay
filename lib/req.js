
var _ = require('lodash');
var cheerio = require('cheerio');
var log = loader.lib('log');
var request = require('request');
var userAgent = require('user-agents');

module.exports = function(options, cb) {
	return request(options, function(err, res, body) {
		if(err) {
			return cb(err);
		}

		var $;
		try {
			$ = cheerio.load(body);
		} catch(e) {}

		cb(null, {
			'$': $,
			'body': body,
			'headers': _.get(res, 'headers'),
			'status': _.get(res, 'statusCode')
		});
	});
};

module.exports.session = function() {
	var api = {};
	api.userAgent = userAgent.random().toString();
	api.requests = [];
	api.jar = request.jar();
	api.req = function(options, cb) {
		options.jar = api.jar;
		options.headers = options.headers || {};
		options.headers['user agent'] = api.userAgent;
		return module.exports(options, cb);
	};

	return api;
};
