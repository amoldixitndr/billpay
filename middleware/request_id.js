
var ctx = loader.lib('ctx');
var guid = loader.lib('guid');
var log = loader.lib('log');

module.exports = function(req, res, next) {
	ctx.set('request_id', guid.create());
	ctx.set('request_method', req.method);
	ctx.set('request_path', req.path);
	ctx.set('request_ip', req.get('ip'));
	res.headers.set('X-Request-ID', ctx.get('request_id'));
	log.info('Request ID', ctx.get('request_id'));
	ctx.set('request_user_agent', req.headers.get('User-Agent'));
	next();
};
