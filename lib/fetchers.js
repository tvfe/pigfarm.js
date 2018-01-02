'use strict';
var requestFactory = require("pigfarm-fetcher");
var debug = require("debug")('autoserver-fetcher');
/**
 * decorate requestFactory and return a promise
 * @param cgiConfig
 * @returns {{}}
 */
var exportee = module.exports = function (cgiConfig) {
	var exportee = {};
	var fetchers = requestFactory(cgiConfig);

	Object.keys(cgiConfig).forEach(function (datakey) {

		exportee[datakey] = function (data) {
			return new Promise(function (rs, rj) {
				var request = fetchers[datakey].call(this, data, function (err, data) {
					// compat old version
					if (err) {
						rj(err);
					} else {
						rs({ data });
					}
				});
				// 兼容callback的方式
				if (request && typeof request.then == 'function') {
					// new version
					request.then(function (ret) {
						rs({
							data: ret.result,
							timestat: ret.timestat
						})
					}, function (e) {
						rj(e)
					})
				}
				return request
			}.bind(this));
		};
	});

	return exportee
};

exportee.useFetcher = function (rf) {
	requestFactory = rf;
};