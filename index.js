'use strict';
var nodedebug = require("debug");
var assert = require("assert");
var extend = require("extend");
var pigfarmRender = require("pigfarm-render");

var runDependenciesTree = require("./lib/asyncDependencies");
var createInjector = require("./lib/data-injector");
var fetchersFactory = require("./lib/fetchers");

var createlog = nodedebug("auto-creating");
var servelog = nodedebug("auto-serving");
var EventEmitter = require("events");

var exportee = module.exports = function (config, option) {
	// 处理传入参数
	option = option || {};

	assert.equal(typeof (config.data = config.data || {}), 'object', 'please give pigfarm.js a datasource map');

	if (!config.render) {
		config = extend({}, config);
		if (config.template) {
			config.render = pigfarmRender(config.template, config.helper || {})
		} else {
			config.render = config.render || (function (d) { return JSON.stringify(d) });
		}
	}

	// 静态数据
	var _staticJSON = {};
	// 函数式静态数据
	var _staticFunc = {};
	// 数据源
	var fetchers = {};
	// 渲染函数
	var render = config.render;

	// 暴露出去的函数
	var exportee = function (fetchContext) {
		var self = this;

		return new Promise(function (resolve, reject) {
			servelog('start', option);
			if (option.timeout && !isNaN(+option.timeout)) {
				setTimeout(function () {
					reject(new Error('pigfarm timeout'));
				}, option.timeout)
			}
			const contextParam = fetchContext || {};

			// 把静态数据复制一遍
			var renderData = extend(contextParam, JSON.parse(JSON.stringify(_staticJSON)));

			// inject the return value of staticFunc
			Object.keys(_staticFunc).forEach(function (key) {
				var result = _staticFunc[key](contextParam);
				if (typeof result === 'object') {
					createInjector(key, renderData)(result);
				} else {
					console.log('WARNING: static ' + key + ' is ignored, function of value must return object');
				}
			});

			// 数据源获取树
			var requestTree = {};

			servelog('fetch start');
			emitEvent(exportee, ['fetchstart', self]);

			// 创建一个数据源依赖树
			Object.keys(fetchers).forEach(function (key) {

				requestTree[key] = {
					dep: config.data[key].dependencies,
					factory: function (datas) {

						var fetchersStart = Date.now(); // 统计单个请求的耗时
						return fetchers[key].call(self, extend({}, datas, contextParam))
							.then(function (ret) {
								ret = ret.data;
								emitEvent(exportee, ['anyfetchsuccess', self, {
									time: Date.now() - fetchersStart,
									name: key
								}]);

								// 如果数据源返回空值，兼容成空对象
								if (ret === void 0 || ret === null || ret === false) {
									return {};

								} else {
									return ret;
								}
							})
							.catch(function (err) {
								emitEvent(exportee, ['anyfetcherror', self, {
									time: Date.now() - fetchersStart,
									name: key
								}]);
								throw err;
							});
					}
				};
			});

			runDependenciesTree
				.call(self, requestTree)
				.then(function (fetched) {
					servelog('fetch end');
					emitEvent(exportee, ['fetchend', self]);

					Object.keys(fetched).forEach(function (key) {
						var result = fetched[key];
						var dep = config.data[key].dependencies;
						if (dep && !config.data[key].mountatglobal) {
							createInjector(key)(result, fetched[dep[0]])

						} else {
							createInjector(key, renderData)(result);

						}
					});
					emitEvent(exportee, ['renderstart', self]);
					// render
					servelog('renderData keys', Object.keys(renderData));

					try {
						var html = render(renderData);

					} catch (e) {
						e.status = e.status || 555;
						e.renderData = renderData;
						return reject(e);
					}

					emitEvent(exportee, ['renderend', self]);

					resolve(html);
				})
				.catch(reject);

		}).catch(function (err) {
			err.status = err.status || 503;
			throw err
		});
	};
	// 暴露出去的函数是一个EventEmitter实例
	extend(exportee, EventEmitter.prototype);

	// 读取数据源
	createlog('reading data sources');


	Object.keys(config.data).forEach(function (key) {
		var dataSource = config.data[key];

		if (dataSource.type == 'request') {
			// request, fetch them when user's requests come in
			// if this config is request, create fetchers
			fetchers[key] = dataSource.action;

			fetchers[key].name = key;

		} else if (dataSource.type == 'static') {
			// static json, put it into result
			// _staticJSON[key] = value;

			typeof (dataSource.value) === 'function' ? (_staticFunc[key] = dataSource.value) // put the static function
				: createInjector(key, _staticJSON)(dataSource.value); // put the static data into result

		} else {
			throw new Error('must indicate a type for datasource');

		}
	});

	// 包装数据获取器
	fetchers = fetchersFactory(fetchers);

	createlog('readed data sources, static:', _staticJSON);

	return exportee;
};

exportee.useFetcher = function (fetcher) {
	fetchersFactory.useFetcher.apply(this, arguments);
};

function decorateWithEvent(fn, emitter) {
	return function () {
		emitEvent(emitter, [this]);
		return fn.apply(this, arguments);
	}
}

function emitEvent(emitter, args) {
	try {
		emitter.emit.apply(emitter, args);
	} catch (e) {
	}
}

function noop() {
}
