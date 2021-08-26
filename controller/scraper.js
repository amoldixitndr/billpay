
var log = loader.lib('log');
var scraperService = loader.service('scraper');

module.exports.automate = function(req, res, next) {
	req.body = req.body || {};
	req.body.payload = req.body.payload || {};

	if(req.body.action == 'validate') {
		req.body.payload.validate = true;
	} else if(req.body.action != 'submit') {
		return req.dump('INVALID_ACTION');
	}

	scraperService.run(req.body.type, req.body.payload, req.dump);
};
