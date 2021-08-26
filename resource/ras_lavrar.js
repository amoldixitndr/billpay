
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
		'zip': joi.string().required()
	}),
	'payment': joi.object().required().keys({
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
			var url = 'https://web.paymentvision.com/raslavrar/login.aspx';
			return res.page.goto(url, {
				'waitUntil': 'load',
				'timeout': 10 * 1000
			});
		})
		.step('wait_for_form', function(res, next) {
			return res.page.untilSelector('input#PageContent1_ctl00_CONTROL_LoginWidget_Txt_UserName');
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
				
				$('input#PageContent1_ctl00_CONTROL_LoginWidget_Txt_UserName').val(body.file.number.replace(/\D/g,''));
				$('input#PageContent1_ctl00_CONTROL_LoginWidget_Txt_Password').val(body.file.zip);

				setTimeout(function() {
					$('input#PageContent1_ctl00_CONTROL_LoginWidget_Btn_Login').click();
				}, 1000);
				cb();
			}, res.validated);
		})
		.step('screenshot', function(res, next) {
			return res.page.saveScreenshot(next);
		})
		.step('wait_for_update_button', function(res, next) {
			return res.page.untilSelector('input#PageContent1_ctl00_CONTROL_CustomerProfile_Btn_Continue');
		})
		.step('click_continue_button', function(res, next) {
			return res.page.click('input#PageContent1_ctl00_CONTROL_CustomerProfile_Btn_Continue');
		})
		.step('wait_for_make_payment_button', function(res, next) {
			return res.page.untilSelector('input#PageContent1_ctl00_CONTROL_CustomerAccount_Btn_MakePayment');
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.step('click_make_payment', function(res, next) {
			return res.page.click('input#PageContent1_ctl00_CONTROL_CustomerAccount_Btn_MakePayment');
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
				set($('input#Txt_PaymentDate'), body.payment.date);

				setTimeout(function() {
					$('input#PageContent1_ctl00_CONTROL_PaymentMethods_Btn_Continue').click();
				}, 1000);
				cb();
				return ret;
			}, res.validated);
		})
		.step('wait_for_authorize', function(res, next) {
			return res.page.untilSelector('input#PageContent1_ctl00_CONTROL_VerifyInformation_chkAuthorizePayment');
		})
		.step('delay', function(res, next) {
			_.delay(next, 500);
		})
		.step('validator', function(res, next) {
			if(validate) {
				return next('SUCCESS_VALIDATED');
			}

			next();
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

				$('input#PageContent1_ctl00_CONTROL_VerifyInformation_chkAuthorizePayment').prop('checked', true);
				set($('input#PageContent1_ctl00_CONTROL_VerifyInformation_txtPassword'), body.file.zip);

				setTimeout(function() {
					$('input#btnSubmitPayment').click();
				}, 1000);
				cb();
				return ret;
			}, res.validated);
		})
		.step('wait_for_confirmation', function(res, next) {
			return res.page.untilSelector('#PageContent1_ctl00_CONTROL_Response_paymentConfirmationMessageTitle');
		})
		.step('delay', function(res, next) {
			_.delay(next, 1000);
		})
		.step('check_confirmation', function(res, next) {
			res.page.evaluate(function() {
				var isSuccess = false;
				var markup = $('body').text();
				markup = markup.toLowerCase();
				if(markup.indexOf('thank you for your payment') > -1) {
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
						'pdf': _.get(_res, 'pdf.pdf'),
						'action': (validate ? 'validate' : 'submit')
					});
				});
		});
};
