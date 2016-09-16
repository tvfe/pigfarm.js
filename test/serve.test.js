'use strict';
var test = require("ava").test;
var assert = require("assert");
var aotu = require("..");
var requestFactory = require("@tencent/auto-request-factory");
var extend = require("extend");
var templateCompiler = require("./es6templateCompiler");

requestFactory.registerRequestor('default', function (cfg, callback) {
	setTimeout(function () {
		callback(null, {testdata: true});
	}, 200);
});
requestFactory.registerRequestor('error', function (cfg, callback) {
	setTimeout(function () {
		callback(new Error(cfg.url));
	})
});

test('render error', async function () {
	try {
		await aotu({
			render: templateCompiler('<html>\n' +
				'<head></head>\n' +
				'    <body>\n' +
				'        <div>${undef.hehe}</div>\n' +
				'    </body>\n' +
				'</html>'),
			data: {}
		})();
	} catch (e) {
		assert.equal(e.status, 555);
		assert(e.wrapper.indexOf('4 > |         <div>${undef.hehe}</div>') != -1);
	}
});
test('run helper', async function () {
	var result = await aotu({
		render: templateCompiler('${_.json(auto)}', {
			json: function (data) {
				return JSON.stringify(data);
			}
		}),
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
	})();
	assert.equal(result, '{"testdata":true,"wocao":1}');
});
test('requestEnd hook', async function () {
	return new Promise(function (resolve, reject) {
		aotu({
			render: ()=> '<div></div>',
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
		render: function (data) {
			return JSON.stringify({
				auto: data.auto,
				depglobal: data.depglobal
			})
		},
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
test('requestError', async function () {
	try {
		await aotu({
			data: {
				err: {
					type: "request",
					action: {
						url: "error://hehe",
						onError: e=> {
							e.status = 302;
							return e;
						}
					}
				}
			},
			render: function (data) {
				return JSON.stringify(data);
			}
		})();
	} catch (e) {
		assert.equal(e.status, 302);
	}
});
test('static data', async function () {
	var result = await aotu({
		data: {
			'ret.json': {
				type: "static",
				value: '{"hehe": 1}'
			},
			'ret.request': {
				type: "request",
				action: {
					url: "what://ever"
				}
			}
		},
		render: function (data) {
			return data;
		}
	})();
	assert.equal(result.ret.json.hehe, 1);
	assert(result.ret.request.testdata);
	assert.equal(result['ret.json'], void 0);
});
test('invalid data source', async function () {
	try {
		aotu({
			data: {
				sth: {
					value: "{}"
				}
			},
			render: function () {
				return 'abc'
			}
		})
	} catch(e) {
		assert.equal(e.message, 'must indicate a type for datasource');
	}

});