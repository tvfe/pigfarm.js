'use strict';
/**
 * 模拟数据源挂掉的情况
 * 
 * PIGFARM_DRILL=hehe:f300,haha:5000
 * 代表hehe数据源在300毫秒后失败，haha数据源在5秒后才返回
 */
var drills = {};
if (typeof window === 'undefined' && process.env.PIGFARM_DRILL) {
	var drillEnv = process.env.PIGFARM_DRILL.split(',');
	drillEnv.forEach(function(env) {
		env = env.split(':');
		var key = env[0];
		var value = env[1];
    var type = 'timeout';
		if (value[0] == 'f') {
      type = 'failure';
      value = value.slice(1);
    }

    drills[key] = {
      type: type,
      value: +value
    }
	});
}

if (Object.keys(drills).length) {
  module.exports = drills;

} else {
  module.exports = null;
}