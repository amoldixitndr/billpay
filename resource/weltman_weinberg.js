
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
		'holders_name': joi.string().required(),
		'routing_number': joi.string().required(),
		'account_number': joi.string().required(),
		'check_number': joi.string().required()
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
			var url = 'https://epay.weltman.com/?ReturnUrl=%2fPayment.aspx';
			return res.page.goto(url, {
				'waitUntil': 'load',
				'timeout': 10 * 1000
			});
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('input#MainContent_LoginUser_Agreement');
		})
		.step('jquery', function(res, next) {
			res.page.jquery(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
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

				jQuery('input#ctl00_MainContent_LoginUser_UserName').val(body.file.number.replace(/\D/g,''));
				jQuery('input#ctl00_MainContent_LoginUser_Password').val(body.file.ssn);
				jQuery('input#MainContent_LoginUser_Agreement').prop('checked', true);

				setTimeout(function() {
					jQuery('span#ctl00_MainContent_LoginUser_btnLogin').click();
				}, 1000);
				cb();
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('span#ctl00_MainContent_rbtnPartialPayment');
		})
		.step('jquery', function(res, next) {
			res.page.jquery(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.step('form', function(res, next) {
			log.info('Clicking pay other amount');
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

				jQuery('span#ctl00_MainContent_rbtnPartialPayment').click();
				cb();
				return ret;
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('#MainContent_accountHolderName');
		})
		.step('jquery', function(res, next) {
			res.page.jquery(next);
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.step('type_name', function(res, next) {
			return res.page.type('input#MainContent_txtAccountHolderName', body.checking_account.holders_name);
		})
		.step('type_check_number', function(res, next) {
			return res.page.type('input#MainContent_txtCheckNumber', body.checking_account.check_number);
		})
		.step('type_routing', function(res, next) {
			return res.page.type('input#MainContent_txtRoutingNumber', body.checking_account.routing_number);
		})
		.step('type_account', function(res, next) {
			return res.page.type('input#MainContent_txtAccountNumber1', body.checking_account.account_number);
		})
		.step('type_confirm_account', function(res, next) {
			return res.page.type('input#MainContent_txtAccountNumber2', body.checking_account.account_number);
		})
		.step('type_amount', function(res, next) {
			return res.page.type('input#MainContent_txtAmount', body.payment.amount);
		})
		.step('submit_form', function(res, next) {
			return res.page.click('span#ctl00_MainContent_rbtnNext');
		})
		.step('wait_for_verify', function(res, next) {
			return res.page.untilSelector('input#MainContent_Agreement');
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.step('check_authorize', function(res, next) {
			return res.page.click('input#MainContent_Agreement');
		})
		.step('submit', function(res, next) {return next();
			return res.page.click('span#ctl00_MainContent_rbtnSubmitPayment');
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
