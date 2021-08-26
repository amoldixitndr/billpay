
var _ = require('lodash');
var aws = require('aws-sdk');
var json = loader.lib('json');
var settings = loader.lib('settings');

var lambda = new aws.Lambda({
	'region': settings('deploy_aws_region'),
	'accessKeyId': settings('deploy_aws_key'),
	'secretAccessKey': settings('deploy_aws_secret')
});

module.exports.convert = function(html, cb) {
	lambda.invoke({
		'FunctionName': 'html-to-pdf',
		'InvocationType': 'RequestResponse',
		'Payload': json.stringify({
			'html': html
		})
	}, function(err, res) {
		if(err) {
			return cb(err);
		}

		var data = _.get(res, 'Payload');
		data = data && json.parse(data);
		data = _.get(data, 'data');
		if(!data) {
			return cb('INVALID_RENDER');
		}

		data = _.toString(data);
		cb(null, data);
	});
};
