var test = require("ava").test;
var requestFactory = require("@tencent/auto-request-factory");
var assert = require("assert");
var aotu = require("..");
aotu.useFetcher(requestFactory);
var templateCompiler = require("./es6templateCompiler");
requestFactory.registerRequestor('default', function (cfg, callback) {
	setTimeout(function () {
		callback(null, {testdata: true});
	}, 200);
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
			data: {
				data: {
					type: "request",
					action: {
						url: "what://ever"
					}
				}
			}
		})();
	} catch (e) {
		assert.equal(e.status, 555);
		assert(e.wrapper.indexOf('4 > |         <div>${undef.hehe}</div>') != -1);
	}
});

test('default render', async function () {
	var result = await aotu({
		data: {
			data: {
				type: "static",
				value: {
					url: "what://ever"
				}
			}
		}
	})();
	assert.equal(result.data.url, 'what://ever')
});