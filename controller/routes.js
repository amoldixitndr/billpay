
var router = loader.lib('router').create;

var api = router()
					.use('m:dump')
					.use('m:request_id')
					.use('m:headers')
					.get('/headers', 'c:misc > headers')
					.use('m:api_key')
					.post('/automate', 'c:scraper > automate');

module.exports = router().use('/api/v1', api);
