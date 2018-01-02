const test = require('ava').test;
const fetchers = require('../lib/fetchers');
const pf = require('@tencent/auto-request-factory');

pf.registerRequestor('default', function (cfg, callback) {
  setTimeout(function () {
    callback(null, { testdata: true });
  }, 200);
});
pf.registerRequestor('error', function (cfg, callback) {
  setTimeout(function () {
    callback(new Error('hehe'));
  }, 200);
});
fetchers.useFetcher(pf);

let fetcher = fetchers({
  test: {
    url: "def://"
  },
  error: {
    url: "error://",
    onError: e=> e
  }
});

test('fetchers请求成功', async t => {
  let res = await fetcher.test({});
  t.deepEqual(res.data, { testdata: true });
});

test('fetchers请求失败', async t => {
  t.plan(1);
  try {
    await fetcher.error({});

  } catch (e) {
    t.is(e.message, 'hehe');
  }
});