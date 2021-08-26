
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
		'last_name': joi.string().required(),
		'ssn': joi.string().required()
	}),
	'payment': joi.object().required().keys({
		'amount': joi.string().required()
	}),
	'checking_account': joi.object().required().keys({
		'holders_name': joi.string().required(),
		'type': joi.any().valid('personal', 'business').required(),
		'routing_number': joi.string().required(),
		'account_number': joi.string().required(),
		'check_number': joi.string().required()
	}),
	'consumer': joi.object().required().keys({
		'first_name': joi.string().required(),
		'middle_initial': joi.string(),
		'last_name': joi.string().required(),
		'address_1': joi.string().required(),
		'address_2': joi.string(),
		'city': joi.string().required(),
		'state': joi.string().required(),
		'zip': joi.string().required()
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
			var url = 'https://messerlikramer.stratuspayments.net/';
			return res.page.goto(url, {
				'waitUntil': 'load',
				'timeout': 10 * 1000
			});
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('button#btnsubmit');
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

				var file = body.file.number.replace(/\D/g,'');
				$('input#fileNumber1').val(file.substr(0, 2));
				$('input#fileNumber2').val(file.substr(2));
				$('input#LastName').val(body.file.last_name);
				$('input#SSN').val(body.file.ssn);

				setTimeout(function() {
					$('button#btnsubmit').click();
				}, 1000);
				cb();
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('wait_for_pay_button', function(res, next) {
			return res.page.untilSelector('button#PayBtn');
		})
		.step('click_pay_button', function(res, next) {
			return res.page.click('button#PayBtn');
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('input#amount');
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
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
					field.blur();
				};

				set($('input#amount'), body.payment.amount);

				set($('input#DebtorFirstName'), body.consumer.first_name);
				set($('input#DebtorMiddleName'), body.consumer.middle_initial);
				set($('input#DebtorLastName'), body.consumer.last_name);
				set($('input#DebtorAddress1'), body.consumer.address_1);
				set($('input#DebtorAddress2'), body.consumer.address_2);
				set($('input#DebtorCity'), body.consumer.city);
				set($('select#DebtorState'), body.consumer.state);
				set($('input#DebtorZip'), body.consumer.zip);
				
				set($('input#ckCheckName'), body.checking_account.holders_name);
				set($('select#ckAccountType'), body.checking_account.type);
				set($('input#ckABA'), body.checking_account.routing_number);
				set($('input#ckAcctNumber'), body.checking_account.account_number);
				set($('input#ckNumber'), body.checking_account.check_number);

				$('input#ACHVerify').prop('checked', true);

				setTimeout(function() {
					// $('button[onclick=\'SubmitForm(event)\']').click();
				}, 1000);
				cb();
				return ret;
			}, res.validated);
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
