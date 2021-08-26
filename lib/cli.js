
var log = loader.lib('log');
var settings = loader.lib('settings');

try {
	//- Run shim local:
	if(loader.lib('args').get('local')) {
		loader.lib('shim').create({
			'port': 2000,
			'headers': {
				'cf-key': settings('client_key_web'),
				'X-Forwarded-For': '192.168.1.1'
			}
		}, require('../index').handler);
	}

	if(1 && loader.lib('args').get('deploy')) {
		loader.lib('deploy').deployLambdaFunctionViaS3({
			'aws': {
				'region': settings('deploy_aws_region'),
				'key': settings('deploy_aws_key'),
				'secret': settings('deploy_aws_secret'),
				'bucket': settings('deploy_aws_bucket')
			},
			'function': settings('deploy_aws_function')
		}, log.json);
	}

	//- Deploy lambda function:
	if(0 && loader.lib('args').get('deploy')) {
		loader.lib('deploy').deployLambdaFunction({
			'aws': {
				'region': settings('deploy_aws_region'),
				'key': settings('deploy_aws_key'),
				'secret': settings('deploy_aws_secret')
			},
			'function': settings('deploy_aws_function')
		}, log.json);
	}
} catch(e) {
	log.info('Error', e);
}
