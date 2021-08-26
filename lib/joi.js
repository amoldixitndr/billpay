
var _ = require('lodash');
var joi = require('joi');
var log = loader.lib('log');
var moment = require('moment');

joi = joi.defaults(function(schema) {
	return schema.empty(null);
});

joi = joi.extend(function(joi) {
	return {
		'base': joi.string().trim().replace(/[\u200B-\u200D\uFEFF]/g, ''),
		'name': 'string',
		'coerce': function(val, state, options) {
			if(!_.isString(val)) {
				return val;
			}

			if(_.isEmpty(val)) {
				return undefined;
			}

			return _.deburr(val);
		}
	};
});

joi = joi.extend(function(joi) {
	return {
		'base': joi.string().replace(/[^a-zA-Z\'\.\"\s]/g, '').replace(/\s+/g, ' ').min(1).max(30),
		'name': 'name'
	};
});

joi = joi.extend(function(joi) {
	return {
		'base': joi.string().lowercase().email(),
		'name': 'email'
	};
});

joi = joi.extend(function(joi) {
	return {
		'base': joi.string().replace(/[^a-zA-Z0-9\_\.]/g, '').min(1).max(30),
		'name': 'username'
	};
});

joi = joi.extend(function(joi) {
	return {
		'base': joi.string().replace(/\D/g, '').min(10).max(13),
		'name': 'phone',
		'pre': function(val, state, options) {
			if(!_.startsWith(val, '1') && val.length === 10) {
				val = '1' + val;
			}
			return val;
		}
	};
});

// joi = joi.extend(function(joi) {
// 	return {
// 		'base': joi.string().replace(/\D/g, ''),
// 		'name': 'future',
// 		'pre': function(val, state, options) {
			
// 		}
// 	};
// });

joi = joi.extend(function(joi) {
	return {
		'base': joi.string(),
		'name': 'string',
		'language': {
			'future': 'needs to be a valid date (MM/DD/YYYY) and in the future'
		},
		'rules': [{
			'name': 'future',
			'validate': function(params, val, state, options) {
				val = _.toString(val).trim().replace(/[^0-9\-]/g, '');
				var err;

				var date = moment(val, 'MM/DD/YYYY');
				if(!date.isValid()) {
					err = true;
				} else if(date.isBefore(moment().startOf('day'))) {
					err = true;
				}

				if(err) {
					return this.createError('string.future', {
						'v': val
					}, state, options);
				}

				return val;
			}
		}]
	};
});

module.exports = joi;

var emailSchema = joi.email().required();

module.exports.isValidEmail = function(email) {
	var ret = joi.validate(email, emailSchema);
	if(!ret || ret.error) {
		return false;
	}
	return ret.value;
};

var phoneSchema = joi.phone().required();

module.exports.isValidPhone = function(phone) {
	var ret = joi.validate(phone, phoneSchema);
	if(!ret || ret.error) {
		return false;
	}
	return ret.value;
};

var strSchema = joi.string().required();
module.exports.isValidString = function(str) {
	var ret = joi.validate(str, strSchema);
	if(!ret || ret.error) {
		return false;
	}
	return ret.value;
};
