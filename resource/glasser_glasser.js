
var _ = require('lodash');
var flow = loader.lib('flow');
var joi = loader.lib('joi');
var log = loader.lib('log');
var puppeteer = loader.lib('puppeteer');

var debug = 1;
if(!!process.env.LAMBDA_TASK_ROOT) {
	debug = 0;
}

var schema = joi.object().required().keys({
	'file': joi.object().required().keys({
		'number': joi.string().required(),
		'ssn': joi.string().required()
	}),
	'payment': joi.object().required().keys({
		'amount': joi.string().required()
	}),
	'checking_account': joi.object().required().keys({
		'routing_number': joi.string().required(),
		'account_number': joi.string().required()
	}),
	'consumer': joi.object().required().keys({
		'first_name': joi.string().required(),
		'last_name': joi.string().required(),
		'address_1': joi.string().required(),
		'address_2': joi.string(),
		'city': joi.string().required(),
		'state': joi.string().required(),
		'zip': joi.string().required(),
		'phone': joi.string().required()
	})
});

module.exports.run = function(body, cb) {
	var validate = !!body.validate;
	delete body.validate;

	flow()
		.step('validated', function(res, next) {
			joi.validate(body, schema, next);
		})
		.step('spawn', function(res, next) {
			puppeteer.getBrowser({
				'debug': debug
			}, function(err, _res) {
				if(err) {
					return next(err);
				}

				res.page = _.get(_res, 'page');
				res.browser = _.get(_res, 'browser');
				next();
			});
		})
		.step('home', function(res, next) {
			var url = 'https://www.payglasserlaw.com/';
			return res.page.goto(url, {
				'waitUntil': 'load',
				'timeout': 10 * 1000
			});
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('button#terms-pop');
		})
		.step('agree_to_terms', function(res, next) {
			log.info('Clicking terms');
			return res.page.click('button#terms-pop');
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('button#agree');
		})
		.step('delay', function(res, next) {
			_.delay(next, 1000);
		})
		.step('click_agree', function(res, next) {
			log.info('Clicking agree');
			return res.page.click('button#agree');
		})
		.step('wait_for_iframe', function(res, next) {
			return res.page.untilSelector('iframe#payment');
		})
		.step('iframe_url', function(res, next) {
			log.info('Getting iframe url');
			return res.page.evaluate(function(body) {
				var cb;
				var ret = new Promise(function(resolve, reject) {
					cb = function(err, res) {
						if(err) {
							return reject(err);
						}

						resolve(res);
					};
				});

				setTimeout(function() {
					var url = $('iframe#payment').attr('src');
					cb(null, url);
				}, 1000);
				return ret;
			}, res.validated);
		})
		.step('open_form_frame', function(res, next) {
			log.info('Opening', res.iframe_url);
			return res.page.goto(res.iframe_url, {
				'waitUntil': 'load',
				'timeout': 10 * 1000
			});
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('#MerchInvoice');
		})
		.step('delay', function(res, next) {
			_.delay(next, 1000);
		})
		.step('form', function(res, next) {
			log.info('Filling out login form', res.form_frame);
			return res.page.evaluate(function(body) {
				var cb;
				var ret = new Promise(function(resolve, reject) {
					cb = function(err, res) {
						if(err) {
							return reject(err);
						}

						resolve(res);
					};
				});

				var set = function(field, val) {
					if(field && val) {
						console.log('Setting', field, val);
						field.val(val);
					}
					field.blur();
				};

				set(jQuery('#MerchInvoice'), body.file.number);
				set(jQuery('#MerchClientAccount'), body.file.ssn);
				set(jQuery('#NameFirst'), body.consumer.first_name);
				set(jQuery('#NameLast'), body.consumer.last_name);
				set(jQuery('#Addr1'), body.consumer.address_1);
				set(jQuery('#Addr2'), body.consumer.address_2);
				set(jQuery('#City'), body.consumer.city);
				set(jQuery('#State'), body.consumer.state);
				set(jQuery('#PostalCode'), body.consumer.zip);
				set(jQuery('#Phone'), body.consumer.phone);
				set(jQuery('#Email'), body.consumer.email);

				jQuery('#PmtTypeID').val('2');
				jQuery('#PmtTypeID').trigger('change');

				set(jQuery('#Routing'), body.checking_account.routing_number);
				jQuery('#AcctTypeC').prop('checked', true);
				set(jQuery('#ccd'), body.checking_account.account_number);
				set(jQuery('#AmountBase'), body.payment.amount);

				setTimeout(function() {
					// $('input#SubmitBtn').click();
				}, 1000);
				cb();
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.run(function(err, res) {
			if(err == 'SUCCESS_VALIDATED') {
				log.info('Validation successful');
				err = null;
			}

			flow()
				.step('final_screenshot', function(_res, next) {
					if(res.page) {
						return res.page.saveScreenshot(next);
					}

					next();
				})
				.step('pdf', function(_res, next) {
					if(debug) {
						log.info('Not generating PDF in debug mode');
						return next();
					}

					if(res.page) {
						return res.page.savePdf(next);
					}

					next();
				})
				.step('close_browser', function(_res, next) {
					if(!debug && res.browser) {
						log.info('Closing browser');
						return res.browser.close();
					}

					next();
				})
				.run(function(_err, _res) {
					cb(null, {
						'err': err || undefined,
						'success': !err,
						'session_id': _.get(res, 'page.session_id'),
						'pdf': _.get(_res, 'pdf.pdf'),
						'action': (validate ? 'validate' : 'submit')
					});
				});
		});
};
