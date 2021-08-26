
var _ = require('lodash');
var chromium = require('chrome-aws-lambda');
var flow = loader.lib('flow');
var fs = require('fs');
var guid = loader.lib('guid');
var log = loader.lib('log');
var moment = require('moment');
var path = require('path');
var s3 = loader.lib('s3');
var settings = loader.lib('settings');

var isLambda = !!process.env.LAMBDA_TASK_ROOT;
var localPath = '/Users/chris/work/chrome-mac/Chromium.app/Contents/MacOS/Chromium';

module.exports.launch = function(options, cb) {
	flow()
		.step('path', function(res, next) {
			if(settings('local')) {
				return next(null, localPath);
			}
			return chromium.executablePath;
		})
		.step('launch', function(res, next) {
			options.args = chromium.args;
			options.executablePath = res.path;

			if(!settings('local')) {
				options.headless = true;
				options.devtools = false;
			} else {
				options.args = [];
			}

			log.info('Launching browser', options);
			chromium.puppeteer.launch(options).then(function(browser) {
				log.info('Launched browser');
				next(null, browser);
			}).catch(next);
		})
		.run(function(err, res) {
			if(err) {
				log.info('Launch error', err);
				return cb(err);
			}
			cb(null, res.launch);
		});
};

module.exports.getBrowser = function(options, cb) {
	flow()
		.step('browser', function(res, next) {
			module.exports.launch({
				'headless': !options.debug,
				'devtools': !!options.debug,
				'args': []
			}, next);
		})
		.step('pages', function(res, next) {
			log.info('Creating page');
			return res.browser.pages();
		})
		.step('page', function(res, next) {
			log.info('Grabbing page');
			next(null, res.pages[0]);
		})
		.step('viewport', function(res, next) {
			log.info('Resizing view');
			return res.page.setViewport({
				'width': 1200,
				'height': 2000,
				'deviceScaleFactor': 2
			});
		})
		.step('utils', function(res, next) {
			log.info('Injecting utils');
			// res.page.jquery = function() {
			// 	log.info('Loading jQuery');
			// 	return res.page.addScriptTag({
			// 		'url': 'https://code.jquery.com/jquery-3.3.1.slim.min.js'
			// 	});
			// };

			var jQuery;
			var getJQuery = function(cb) {
				if(jQuery) {
					return cb(null, jQuery);
				}

				var jqueryPath = path.join(__dirname, 'jquery.js');
				fs.readFile(jqueryPath, 'utf8', function(err, res) {
					if(err) {
						return cb(err);
					}

					jQuery = res;
					cb(null, jQuery);
				});
			};

			res.page.jquery = function(cb) {
				getJQuery(function(err, _res) {
					if(err) {
						return cb(err);
					}

					log.info('Injecting jQuery');
					res.page.evaluate(_res).then(function() {
						_.delay(function() {
							cb();
						}, 50);
					}).catch(cb);
				});
			};

			res.page.wait = function() {
				log.info('Waiting for a bit');
				return res.page.waitFor(5000);
			};

			res.page.session_id = `${moment().format('YYYY-MM-DD')}/${guid.create()}`;
			log.info('Session id', res.page.session_id);

			res.page.screenshots = [];
			res.page.saveScreenshot = function(cb) {
				var path = `${res.page.session_id}/${res.page.screenshots.length + 1}.png`;
				res.page.screenshots.push(path);
				log.info('Taking screenshot', res.page.session_id);
				res.page.screenshot({
					'type': 'png',
					'fullPage': true
				}).then(function(res) {
					log.info('Uploading screenshot', path);
					s3.client.putObject({
						'ACL': 'private',
						'Key': path,
						'Bucket': settings('screenshot_bucket'),
						'Body': res,
						'ServerSideEncryption': 'AES256'
					}, cb);
				}).catch(function(err) {
					log.info('Screenshot err', err);
					cb();
				});
			};

			res.page.pdfs = [];
			res.page.savePdf = function(cb) {
				log.info('Generating PDF', res.page.session_id);
				var path = `${res.page.session_id}/${res.page.pdfs.length + 1}.pdf`;
				res.page.pdfs.push(path);

				res.page.pdf({}).then(function(res) {
					log.info('Uploading PDF', path);
					s3.client.putObject({
						'ACL': 'private',
						'Key': path,
						'Bucket': settings('screenshot_bucket'),
						'Body': res,
						'ServerSideEncryption': 'AES256'
					}, function(err) {
						if(err) {
							return cb(err);
						}

						cb(null, {
							'pdf': Buffer.from(res).toString('base64')
						});
					});
				}).catch(function(err) {
					log.info('PDF err', err);
					cb(err);
				});
			};

			res.page.untilSelector = function(selector) {
				return res.page.waitForSelector(selector, {
					'timeout': 5000
				});
			};

			next();
		})
		.run(function(err, res) {
			if(err) {
				return cb(err);
			}

			cb(null, {
				'page': res.page,
				'browser': res.browser
			});
		})
};
