
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
		'ssn': joi.string().required(),
		'phone': joi.string().required(),
		'first_name': joi.string().required(),
		'last_name': joi.string().required(),
		'street': joi.string().required(),
		'city': joi.string().required(),
		'state': joi.string().required(),
		'zip': joi.string().required()
	}),
	'payment': joi.object().required().keys({
		'first_name': joi.string().required(),
		'last_name': joi.string().required(),
		'street': joi.string().required(),
		'city': joi.string().required(),
		'state': joi.string().required(),
		'zip': joi.string().required(),
		'email': joi.string().required(),
		'bank_name': joi.string().required(),
		'routing_number': joi.string().required(),
		'account_number': joi.string().required(),
		'account_type': joi.any().valid('checking', 'savings').required(),
		'amount': joi.string().required(),
		'date': joi.string().required()
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
			var url = 'https://www.seliplaw.com/payment/';
			return res.page.goto(url, {
				'waitUntil': 'load',
				'timeout': 10 * 1000
			});
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('input#certify_check');
		})
		.step('jquery', function(res, next) {
			res.page.jquery(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 250);
		})
		.step('form', function(res, next) {
			log.info('Filling out login form');
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

				$('input#filenumber').val(body.file.number);

				var ssn = body.file.ssn.replace(/\D/g,'');
				$('input#ssnA').val(ssn.substr(0, 3));
				$('input#ssnB').val(ssn.substr(3, 2));
				$('input#ssnC').val(ssn.substr(5));

				var phone = body.file.phone.replace(/\D/g,'');
				$('input#phoneA').val(phone.substr(0, 3));
				$('input#phoneB').val(phone.substr(3, 3));
				$('input#phoneC').val(phone.substr(6));
				$('select#phonetype').val(body.file.phone_type);
				$('input#yourname').val(body.file.first_name + ' ' + body.file.last_name);
				$('input#street').val(body.file.street);
				$('input#city').val(body.file.city);
				$('select#state').val(body.file.state);
				$('input#zip').val(body.file.zip);
				$('input#certify_check').click();

				setTimeout(function() {
					$('input[value=\'Login\']').click();
				}, 250);
				cb();
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('select#payby');
		})
		.step('jquery', function(res, next) {
			res.page.jquery(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 250);
		})
		.step('form', function(res, next) {
			log.info('Filling make payment type form');
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

				$('select#payby').val('Check');
				setTimeout(function() {
					$('form[name=\'paycenter\']').submit();
				}, 250);
				cb();
				return ret;
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('form[name=\'account\']');
		})
		.step('jquery', function(res, next) {
			res.page.jquery(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 250);
		})
		.step('form', function(res, next) {
			log.info('Filling out payment form');
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
						field.val(val);
					}
				};

				set($('input#yourname'), body.payment.first_name + ' ' + body.payment.last_name);
				set($('input#street'), body.payment.street);
				set($('input#city'), body.payment.city);
				set($('select#state'), body.payment.state);
				set($('input#zip'), body.payment.zip);
				set($('input#email'), body.payment.email);
				set($('input#verify_email'), body.payment.email);
				set($('input#bank'), body.payment.bank_name);
				set($('input#routingno'), body.payment.routing_number);
				set($('input#accountno'), body.payment.account_number);
				set($('input#amount'), body.payment.amount);
				set($('select#checkdate'), body.payment.date);

				// set($('input#account_type'), body.payment.account_type);
				if(body.payment.account_type == 'savings') {
					$('#acct_type_savings').click();
				} else if(body.payment.account_type == 'checking') {
					$('#acct_type_checking').click();
				}

				$('#save_payment_method_no').click();
				setTimeout(function() {
					$('form[name=\'account\'] input[type=\'submit\']').click();
				}, 250);
				cb();
				return ret;
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('form[name=\'confirm\']');
		})
		.step('jquery', function(res, next) {
			res.page.jquery(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 250);
		})
		.step('validator', function(res, next) {
			if(validate) {
				return next('SUCCESS_VALIDATED');
			}

			next();
		})
		.step('submit', function(res, next) {
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

				$('form[name=\'confirm\'] input[name=\'submit\']').click();
				cb();
				return ret;
			});
		})
		.step('wait_for_confirmation', function(res, next) {
			return res.page.untilSelector('a[href=\'.\']');
		})
		.step('jquery', function(res, next) {
			res.page.jquery(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 1000);
		})
		.step('check_confirmation', function(res, next) {
			res.page.evaluate(function() {
				var isSuccess = false;
				var markup = $('body').text();
				markup = markup.toLowerCase();
				if(markup.indexOf('we have your payment request') > -1) {
					isSuccess = true;
				}

				return isSuccess;
			}).then(function(isSuccess) {
				if(!isSuccess) {
					return next('INVALID_RESPONSE');
				}

				log.info('Application submitted successfully');
				next();				
			}).catch(next);
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
						'pdf': _res.pdf,
						'action': (validate ? 'validate' : 'submit')
					});
				});
		});
};
