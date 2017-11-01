'use strict';
var requestFactory = require("pigfarm-fetcher");
var debug = require("debug")('autoserver-fetcher');
var Promise = require("./promise");
//
// function createTimeline() {
//     return {
// 	    [Symbol.iterator]() {
// 		    var obj = this;
// 		    var keys = Object.keys(obj);
// 		    var index = 0;
//
// 		    return {
// 			    next() {
// 				    return {
// 					    value: obj[keys[index]],
// 					    done: index++ == keys.length
// 				    }
// 			    }
// 		    }
// 	    }
//     }
// }
// requestFactory.registerHook('before', function (param) {
// 	delete param.QUERY;
// 	delete param.BODY;
// 	delete param.REQ;
// 	delete param.COOKIE;
// });
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
						rs({data});
					}
				});
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
			});
		};
	});

	return exportee
};

exportee.useFetcher = function (rf) {
    requestFactory = rf;
};