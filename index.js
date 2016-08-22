'use strict';
var vm = require("vm");
var nodedebug = require("debug");
var co = require("co");
var extend = require("extend");

var runDependenciesTree = require("./lib/asyncDependencies");
var createInjector = require("./lib/data-injector");
var fetchersFactory = require("./lib/fetchers");
var getContentNearError = require("./lib/template-err-line");
var escape = require("./lib/escape");

var createlog = nodedebug("auto-creating");
var servelog = nodedebug("auto-serving");

module.exports = function (config, options) {
	options = options || {};

	// static data
	var _staticJSON = {};

	// template helper
	var _templateHelpers = escape.bind(null); // copy the escape function.

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
			var value = tryParseJson(dataSource.value);
			_staticJSON[key] = value;

			// put the static data into result
			createInjector(key, _staticJSON)(value);
		} else {

			throw new Error('must indicate a type for datasource');
		}
	});
	fetchers = fetchersFactory(fetchers);
	createlog('readed data sources, static:', _staticJSON);

	extend(_templateHelpers, config.helper);

	createlog('compiling template');
	try {
		var vmTemplate = new vm.Script('(data)=>{with(data){return `' + config.template + '`}}', {
			filename: 'your-template.tpl'
		});
		vmTemplate = vmTemplate.runInNewContext({
			_: _templateHelpers
		});
		var vmTemplateLines = config.template.split('\n');
	} catch (e) {
		e.kind = `template compile error: `;
		throw e;
	}
	createlog('template compiled');

	createHook(options.onServiceCreateEnd, null)();

	return function (query, cookie, body) {
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
		    const contextParam = {
			    QUERY: query,
			    COOKIE: cookie,
			    BODY: body,
			    REQ: {
				    ip: ''
			    }
		    };

		    // copy the staticJSON
		    var renderData = extend({}, contextParam, _staticJSON);

		    var requestTree = {};

		    servelog('fetch start');
		    hooks['onFetchStart']();

		    // make the dependency tree for all requests
		    Object.keys(fetchers).forEach(key=> {
			    requestTree[key] = {
				    dep: config.data[key].dependencies,
				    factory: datas=> {
					    return fetchers[key].call(
						    this.autonodeContext,
						    extend({}, datas, contextParam)
					    ).then(function (ret) {
						    ret = ret.data;
						    return !ret && ret !== '' ? {} : ret
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
		    try {
			    servelog('renderData keys', Object.keys(renderData));
			    var html = vmTemplate(renderData);
		    } catch(e) {
			    e.wrapper = getContentNearError(e, vmTemplateLines);
			    e.kind = 'render error';
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

function createHook(fn, context) {

	return function () {
		try {
			fn && fn.apply(context, arguments);
		} catch(e) {}
	};
}

function noop() {
}

function tryParseJson(data) {
	if (
		typeof data == 'string' &&
		(
			(data[0] == "{" && data[data.length - 1] == "}") ||
			(data[0] == "[" && data[data.length - 1] == "]")
		)
	) {
		try {
			data = JSON.parse(data);
		} catch (e) {}
	}
	return data;
}
