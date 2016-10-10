'use strict';
var nodedebug = require("debug");
var co = require("co");
var assert = require("assert");
var extend = require("extend");
var pigfarmRender = require("pigfarm-render");

var runDependenciesTree = require("./lib/asyncDependencies");
var createInjector = require("./lib/data-injector");
var fetchersFactory = require("./lib/fetchers");

var createlog = nodedebug("auto-creating");
var servelog = nodedebug("auto-serving");

var exportee = module.exports = function (config, options) {
	options = options || {};

	assert.equal(typeof (config.data = config.data || {}), 'object', 'please give pigfarm.js a datasource map');
	if (!config.render) {
		if (config.template) {
			config.render = pigfarmRender(config.template, config.helper || {})
		} else {
			config.render = config.render || (d=>JSON.stringify(d));
		}
	}

	// static data
	var _staticJSON = {};

	createlog('reading data sources');
	createHook(options.onServiceCreateStart, null)();

	// read data sources
	var fetchers = {};
	Object.keys(config.data).forEach(key=> {
		var dataSource = config.data[key];

		if (dataSource.type == 'request') {
			// request, fetch them when user's requests come in
			// if this config is request, create fetchers
			fetchers[key] = dataSource.action;

		} else if (dataSource.type == 'static') {
			// static json, put it into result
			// _staticJSON[key] = value;

			// put the static data into result
			createInjector(key, _staticJSON)(dataSource.value);

		} else {
			throw new Error('must indicate a type for datasource');

		}
	});
	fetchers = fetchersFactory(fetchers);
	createlog('readed data sources, static:', _staticJSON);

	// var render = Renderer(config.template, config.helper);
	var render = config.render;

	createHook(options.onServiceCreateEnd, null)();

	return function (fetchContext) {
		var self = this;

		return co(function *() {
			var hooks = {};
			[
				'onFetchStart',
				'onFetchEnd',
				'onRenderStart',
				'onRenderEnd'
			].forEach(hookname=> {
				hooks[hookname] = createHook(options[hookname], self);
			});

			servelog('start');
			const contextParam = fetchContext || {};

			// copy the staticJSON
			var renderData = extend(contextParam, JSON.parse(JSON.stringify(_staticJSON)));

			var requestTree = {};

			servelog('fetch start');
			hooks['onFetchStart']();

			// make the dependency tree for all requests
			Object.keys(fetchers).forEach(key=> {

				requestTree[key] = {
					dep: config.data[key].dependencies,
					factory: datas=> {

						return fetchers[key](extend({}, datas, contextParam))
							.then(function (ret) {
								ret = ret.data;

								return !ret ? '' : ret
							});
					}
				};

			});

			var fetched = yield runDependenciesTree.call(this, requestTree);

			servelog('fetch end');
			hooks['onFetchEnd']();

			Object.keys(fetched).forEach(key=> {
				let result = fetched[key];
				let dep = config.data[key].dependencies;
				if (dep && !config.data[key].mountatglobal) {
					createInjector(key)(result, fetched[dep[0]])

				} else {
					createInjector(key, renderData)(result);

				}
			});
			hooks['onRenderStart']();
			// render
			servelog('renderData keys', Object.keys(renderData));

			try {
				var html = render(renderData);

			} catch (e) {
				e.status = e.status || 555;
				throw e;
			}
			hooks['onRenderEnd']();

			return html;

		}).catch(e=> {
			e.status = e.status || 503;

			return Promise.reject(e);
		})
	}
};

exportee.useFetcher = function (fetcher) {
    fetchersFactory.useFetcher.apply(this, arguments);
};

function createHook(fn, context) {

	return function () {
		try {
			fn && fn.apply(context, arguments);
		} catch (e) {
		}
	};
}

function noop() {
}
