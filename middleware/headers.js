
module.exports = function(req, res, next) {
	res.headers.set('X-Frame-Options', 'DENY');
	res.headers.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
	next();
};
