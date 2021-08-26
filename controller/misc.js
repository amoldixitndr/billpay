
var log = loader.lib('log');

module.exports.headers = function(req, res, next) {
	res.success(req.headers.get());
};
