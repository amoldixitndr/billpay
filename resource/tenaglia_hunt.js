
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
		'type': joi.any().valid('personal', 'business').required(),
		'routing_number': joi.string().required(),
		'account_number': joi.string().required(),
		'account_type': joi.any().valid('checking', 'savings').required()
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
			var url = 'https://web.paymentvision.com/tenagliahunt/login.aspx';
			return res.page.goto(url, {
				'waitUntil': 'load',
				'timeout': 10 * 1000
			});
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('input#acknowledge');
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.step('form', function(res, next) {
			log.info('Filling out modal');
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

				$('input#acknowledge').prop('checked', true);
				$('input#makePayment').click();
				
				$('input#PageContent1_ctl00_CONTROL_LoginWidget_Txt_UserName').val(body.file.number);
				$('input#PageContent1_ctl00_CONTROL_LoginWidget_Txt_Password').val(body.file.ssn);

				setTimeout(function() {
					$('input#PageContent1_ctl00_CONTROL_LoginWidget_Btn_Login').click();
				}, 1000);

				setTimeout(function() {
					cb();
				}, 250);
				return ret;
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('wait_for_update_button', function(res, next) {
			return res.page.untilSelector('input#PageContent1_ctl00_CONTROL_CustomerProfile_Btn_UpdateContactInfo');
		})
		.step('click_update_button', function(res, next) {
			return res.page.click('input#PageContent1_ctl00_CONTROL_CustomerProfile_Btn_UpdateContactInfo');
		})
		.step('wait_for_email_input', function(res, next) {
			return res.page.untilSelector('input#PageContent1_ctl00_CONTROL_CustomerProfile_Txt_Email');
		})
		.step('enter_fake_email', function(res, next) {
			return res.page.type('input#PageContent1_ctl00_CONTROL_CustomerProfile_Txt_Email', 'fake@email.com');
		})
		.step('submit_fake_email', function(res, next) {
			return res.page.click('input#PageContent1_ctl00_CONTROL_CustomerProfile_Btn_Update');
		})
		.step('wait_for_confirm', function(res, next) {
			return res.page.untilSelector('input#PageContent1_ctl00_CONTROL_CustomerProfile_Btn_Continue');			
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.step('click_confirm', function(res, next) {
			log.info('Clicking confirm');
			return res.page.click('input#PageContent1_ctl00_CONTROL_CustomerProfile_Btn_Continue');
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('input#txtOtherAmount');
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

				set($('input#txtOtherAmount'), body.payment.amount);

				set($('input#txtRoutingNumber'), body.checking_account.routing_number);
				set($('input#txAccountNumber'), body.checking_account.account_number);

				if(body.checking_account.account_type == 'checking') {
					$('#Rbl_AccountType_0').prop('checked', true);
				} else if(body.checking_account.account_type == 'savings') {
					$('#Rbl_AccountType_1').prop('checked', true);
				}

				if(body.checking_account.type == 'personal') {
					$('#Rbl_AccountType2_0').prop('checked', true);
				} else if(body.checking_account.type == 'business') {
					$('#Rbl_AccountType2_1').prop('checked', true);
				}

				$('#Rdo_SingleUse_1').prop('checked', true);

				setTimeout(function() {
					$('input#PageContent1_ctl00_CONTROL_PaymentMethods_Btn_Continue').click();
				}, 1000);

				setTimeout(function() {
					cb();
				}, 250);
				return ret;
			}, res.validated);
		})
		.step('wait_for_authorization', function(res, next) {
			return res.page.untilSelector('input#PageContent1_ctl00_CONTROL_VerifyInformation_chkAuthorizePayment');
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.step('form', function(res, next) {
			log.info('Filling out verify form');
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

				$('input#PageContent1_ctl00_CONTROL_VerifyInformation_chkAuthorizePayment').prop('checked', true);
				$('input#PageContent1_ctl00_CONTROL_VerifyInformation_txtPassword').val(body.file.ssn);

				setTimeout(function() {
					// $('input#btnSubmitPayment').click();
				}, 1000);

				setTimeout(function() {
					cb();
				}, 250);
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
