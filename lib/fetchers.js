'use strict';
var requestFactory = require("@tencent/auto-request-factory");
var debug = require("debug")('autoserver-fetcher');

function createTimeline() {
    return {
	    [Symbol.iterator]() {
		    var obj = this;
		    var keys = Object.keys(obj);
		    var index = 0;

		    return {
			    next() {
				    return {
					    value: obj[keys[index]],
					    done: index++ == keys.length
				    }
			    }
		    }
	    }
    }
}
requestFactory.registerHook('before', function (param) {
	delete param.QUERY;
	delete param.BODY;
	delete param.REQ;
	delete param.COOKIE;
});
/**
 * decorate requestFactory and return a promise
 * @param cgiConfig
 * @returns {{}}
 */
module.exports = function (cgiConfig) {
	var exportee = {};
	var fetchers = requestFactory(cgiConfig);

	Object.keys(cgiConfig).forEach(datakey=> {
		exportee[datakey] = function (data) {
			return new Promise((rs, rj)=> {

				fetchers[datakey].call(this, data, function (err, data) {
					if (err) {
						rj(err);
					} else {
						rs({data});
					}
				});
			});
		};
	});

	return exportee
};