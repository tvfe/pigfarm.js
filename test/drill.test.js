'use strict';
process.env.PIGFARM_DRILL = 'hehe:f300,haha:3000';
const it = require("ava").test;
const assert = require('assert');
const drills = require('../lib/drills');

it('env', async function (t) {
  t.deepEqual(drills, {
    hehe: { type: 'failure', value: 300 },
    haha: { type: 'timeout', value: 3000 }
  })
});


const fetchers = require('../lib/fetchers');
require('pigfarm-fetcher').registerRequestor('http', function() {});
it('fetchers', async function(t) {
  let requests = fetchers({
    haha: {
      url: 'http://v.qq.com'
    },
    hehe: {
      url: 'http://v.qq.com'
    }
  });

  let start = Date.now();
  let resultHaha = await requests.haha();
  t.true(Date.now() - start > 2000);

  try {
    let resultHehe = await requests.hehe();
  } catch(e) {
    t.is(e.message, 'pigfarm drills');
    return;
  }
  t.true(false);
});