
var settings = loader.lib('settings');

module.exports = function(req, res, next) {
	if(req.query.api_key != settings('api_key')) {
		return next('INVALID_API_KEY');
	}

	next();
};
