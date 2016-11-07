
var log = function () {
	if (arguments.length == 1 && typeof arguments[0] == 'object' && !(arguments[0] instanceof Array)) {
		tvp.$.Ajax({
			url: 'http://v.qq.com/log',
			data: arguments[0],
			dataType: 'jsonp',
			jsonpCallback: 'haha'
		});
	} else {
		var res = '';
		for (var i = 0, len = arguments.length; i < len; i ++) {
			res += JSON.stringify(arguments[i]);
		}
		tvp.$.Ajax({
			url: 'http://v.qq.com/log',
			data: {
				message: res
			},
			dataType: 'jsonp',
			jsonpCallback: 'haha'
		});
	}
};
window.Promise = require('../../lib/promise');
var pigfarm = require('../..');
var requestFactory = require("pigfarm-fetcher");

requestFactory.registerRequestor('fuck', function (cfg, callback) {
	var $a = document.createElement('a');
	$a.href = cfg.url;
	setTimeout(function () {
		callback(null, {name: $a.host}); // chrome 上是$a.pathname
	}, 200);
});

pigfarm({
	render: function (data) {
		return JSON.stringify(data.res);
	},
	data: {
		res: {
			type: "request",
			action: {
				url: "fuck://me",
				fixAfter: function (data) {
					data.fuckAgain = data.name;
					return data;
				}
			}
		}
	}
})().then(function (text) {
	alert(text);
}, function (err) {
	alert(err);
});

// pigfarm({
// 	render: templateCompiler('${_.json(auto)}', {
// 		json: function (data) {
// 			return JSON.stringify(data);
// 		}
// 	}),
// 	data: {
// 		auto: {
// 			type: "request",
// 			action: {
// 				url: "what://ever",
// 				fixAfter: function (data) {
// 					data.wacao = 1;
// 					return data;
// 				}
// 			}
// 		}
// 	}
// })().then(function (text) {
// 	log(text);
// });