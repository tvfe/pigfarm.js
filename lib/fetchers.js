'use strict';
var requestFactory = require("pigfarm-fetcher");
var debug = require("debug")('autoserver-fetcher');
var drills = require('./drills');
/**
 * decorate requestFactory and return a promise
 * @param cgiConfig
 * @returns {{}}
 */
var exportee = module.exports = function (cgiConfig) {
	var exportee = {};
	var fetchers = requestFactory(cgiConfig);

	Object.keys(cgiConfig).forEach(function (datakey) {

		if (drills[datakey]) {
			// 演练用
			if (drills[datakey].type == 'failure') {
				exportee[datakey] = function () {
					return new Promise(function (rs, rj) {
						setTimeout(function () {
							rj(new Error('pigfarm drills'));
						}, drills[datakey].value)
					});
				}

			} else if (drills[datakey].type == 'timeout') {
				exportee[datakey] = function () {
					return new Promise(function (rs, rj) {
						setTimeout(function () {
							rs({});
						}, drills[datakey].value)
					});
				}
			}

			return;
		}

		exportee[datakey] = function (data) {
			return new Promise(function (rs, rj) {
				var request = fetchers[datakey]
					.call(this, data, function (err, data) {
						// compat old version
						if (err) {
							rj(err);
						} else {
							rs({ data: data });
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
