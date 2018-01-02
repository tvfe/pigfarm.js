'use strict';
var test = require("ava").test;
var assert = require("assert");
var pigfarm = require("..");
var extend = require("extend");
var requestFactory = require("pigfarm-fetcher");
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
requestFactory.registerRequestor('time3000', function (cfg, callback) {
    setTimeout(function () {
        callback(null, {});
    }, 3000)
});

test('render error', async function () {
	try {
		await pigfarm({
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
		return
	}
	assert(false)
});
test('run helper', async function () {
	var result = await pigfarm({
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
	let through = 0;
	return new Promise(function (resolve, reject) {
		var service = pigfarm({
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
		});
		service.on('fetchend', function (context, timestat) {
			assert(timestat.auto);
			assert('all' in timestat.auto);
			assert('fixParam' in timestat.auto);
			assert('fixResult' in timestat.auto);
		});
		service.on('fetchstart', function (context) {
			through += 1;
			context.autonodeContext = context.autonodeContext || {};
			context.autonodeContext._timer = Date.now();
		});
		service.on('renderstart', function () {
			through += 10;
			throw new Error('hehe');
		});
		service.on('renderend', function (context) {
			through += 100;
			try {
				assert(!!context.autonodeContext._timer, 'hook changing context fail');
				assert.equal(through, 111);
				// console.log(this.autonodeContext.timeline);
				// for (var data of this.autonodeContext.timeline) {
				// 	assert(Math.abs(data.duration.split('|')[1] / 1000 - 200) < 10);
				// 	assert.equal(data.name, 'auto');
				// }
			} catch (e) {
				return reject(e)
			}
			resolve()
		});
		service.call({});
	})
});
test('fetchers hook', async t=> {
	t.plan(3);
	var service = pigfarm({
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
			},
			time3000: {
				type: "request",
				action: {
					url: "time3000://ever",
					fixAfter: function (data) {
						extend(data, {wocao: 1});
						return data;
					}
				}
			},
			error: {
				type: "request",
				action: {
					url: "error://"
				}
			}
		}
	});
	service.on('anyfetchsuccess', function(ctx, stats) {
		if (stats.name == 'time3000') {
			t.true(Math.abs(stats.time - 3000) < 10, stats.time);

		} else if (stats.name == 'auto') {
			t.true(Math.abs(stats.time - 200) < 10, stats.time);

		} else if (stats.name == 'error') {
			t.fail();
		}
	});
	service.on('anyfetcherror', function(ctx, stats) {
		t.is(stats.name, 'error');
	});
	return await service({});
});
test('dependencies', async function () {
	var result = await pigfarm({
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
		await pigfarm({
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
	var result = await pigfarm({
		data: {
			'ret.json': {
				type: "static",
				value: {"hehe": 1}
			},
			'ret.request': {
				type: "request",
				action: {
					url: "what://ever"
				}
			},
			'ret.func': {
				type: "static",
				value: function(req){
					return {"hehe": 1}
				}
			},
			'ret1': {
				type: "static",
				value: function(req){
					return {"hehe": 1}
				}
			},
			'retUndefine': {
				type: "static",
				value: function(req){
					// return {"hehe": 1}
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
	assert.equal(result.ret.func.hehe, 1);
	assert.equal(result['ret.func'], void 0);
	assert.equal(result.ret1.hehe, 1);
	assert.equal(result['retUndefine'], void 0);
});
test('invalid data source', async function () {
	try {
		pigfarm({
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
test('fail data source', async function() {
	var result = await pigfarm({
		data: {
			sth: {
				type: 'request',
				action: {
					url: "error://123"
				}
			}
		},
		template: '${sth.toString()}'
	})();
	assert.equal(result, '[object Object]');
});
test('timeout', async function() {
    try {
        await pigfarm({
            data: {
                sth: {
                    type: 'request',
                    action: {
                        url: "time3000://123"
                    }
                }
            },
            template: '${sth.toString()}'
        }, {
            timeout: 2000
        })();
    } catch(e) {
        return assert.equal(e.message, 'pigfarm timeout')
    }
    assert(false);
});