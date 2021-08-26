
var _ = require('lodash');
var errors = loader.lib('errors');
var log = loader.lib('log');

module.exports = function(req, res, next) {
	res.error = function(err) {
		err = err || 'NOT_FOUND';
		log.info('Error', err);
		if(_.isString(err)) {
			err = errors[err];
		} else if(_.isError(err)) {
			err = {
				'code': err.name,
				'message': err.message
			};
		} else if(err && err.error_code) {
			err = {
				'code': err.error_code,
				'message': err.error_message
			};
		}

		err = _.extend({}, errors.DEFAULT, err);

		if(err.status === 404 && req.get('client') === 'web') {
			err.status = 418;
		}

		res.status(err.status).json({
			'success': false,
			'error': {
				'code': err.code,
				'message': err.message
			}
		}).done();
	};

	res.success = function(_res) {
		var isError = _.get(_res, 'err');
		_.unset(_res, 'success');
		
		res.status(200).json({
			'success': isError ? false : true,
			'response': _res
		}).done();
	};

	res.dump = function(err, _res) {
		if(err) {
			return res.error(err);
		}

		res.success(_res);
	};

	res.dump.err = function(err) {
		if(err) {
			return res.error(err);
		}

		res.success();
	};

	req.dump = res.dump;
	req.dump.err = res.dump.err;
	req.success = res.success;
	req.error = res.error;

	next();
};
