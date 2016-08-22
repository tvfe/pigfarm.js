'use strict';
var test = require("ava").test;
var assert = require("assert");
var aotu = require("..");
var requestFactory = require("@tencent/auto-request-factory");
var extend = require("extend");

requestFactory.registerRequestor('default', function (cfg, callback) {
	setTimeout(function () {
		callback(null, {testdata: true});
	}, 200);
});

test('compile error', async function () {
	try {
		aotu({
			template: '<div>${function()}</div>',
			data: {}
		});
	} catch (e) {
		assert(e.kind.match(/compile error/));
	}
});