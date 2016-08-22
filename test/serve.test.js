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

test('render error', async function () {
	try {
		await aotu({
			template: '<html>\n' +
			'<head></head>\n' +
			'    <body>\n' +
			'        <div>${undef.hehe}</div>\n' +
			'    </body>\n' +
			'</html>',
			data: {}
		})();
	} catch (e) {
		assert.equal(e.status, 555);
		assert(e.wrapper.indexOf('4 > |         <div>${undef.hehe}</div>') != -1);
	}
});
test('run helper', async function () {
	var result = await aotu({
		template: '${_.json(auto)}',
		data: {
			auto: {
				type: "request",
				action: {
					url: "what://ever",
					fixAfter: function (data) {
						extend(data, {wocao: 1});
						return data;
					}
				}
			}
		},
		helper: {
			json: function (data) {
				return JSON.stringify(data);
			}
		}
	})();
	assert.equal(result, '{"testdata":true,"wocao":1}');
});
test('requestEnd hook', async function () {
	return new Promise(function (resolve, reject) {
		aotu({
			template: '<div></div>',
			data: {
				auto: {
					type: "request",
					action: {
						url: "what://ever",
						fixAfter: function (data) {
							extend(data, {wocao: 1});
							return data;
						}
					}
				}
			}
		}, {
			onFetchStart: function () {
				this.autonodeContext = this.autonodeContext || {};
				this.autonodeContext._timer = Date.now();
			},
			onRenderStart: function () {
				throw new Error('hehe');
			},
			onRenderEnd: function () {
				try {
					assert(!!this.autonodeContext._timer, 'hook changing context fail');
					// console.log(this.autonodeContext.timeline);
					// for (var data of this.autonodeContext.timeline) {
					// 	assert(Math.abs(data.duration.split('|')[1] / 1000 - 200) < 10);
					// 	assert.equal(data.name, 'auto');
					// }
				} catch (e) {
					return reject(e)
				}
				resolve()
			}
		}).call({});
	})
});
test('dependencies', async function () {
	var result = await aotu({
		template: '${JSON.stringify({auto, depglobal})}',
		data: {
			auto: {
				type: "request",
				action: {
					url: "what://ever",
					fixAfter: function () {
						var data = arguments[0];
						extend(data, {wocao: 1});
						return data;
					}
				}
			},
			depauto: {
				type: "request",
				action: {
					url: "what://ever",
					fixAfter: function () {
						var data = arguments[0];
						extend(data, {dep: true});
						return data;
					}
				},
				dependencies: ['auto']
			},
			depglobal: {
				type: "request",
				action: {
					url: "what://ever"
				},
				dependencies: ['auto'],
				mountatglobal: true
			}
		}
	})();
	assert.equal(result, '{"auto":{"testdata":true,"wocao":1,"depauto":{"testdata":true,"dep":true}},"depglobal":{"testdata":true}}');
});