'use strict';
var extend = require("extend");
/**
 * 将结果输出到某个节点上
 * @param key 输出对象路径
 * @param obj 输出对象
 * @returns {Function}
 *      @param data 要输出的结果
 *      @param obj optional 输出对象(仅有路径、且无输出对象时生效)
 */
module.exports = function createInjector(key, obj) {
	var _injectObject = obj;
	var _injectKey = key;

	return function inject(data, obj) {
		var injectObject = _injectObject;
		var injectKey = _injectKey;

		if (injectKey) {
			injectObject = injectObject || obj;

			if (!injectObject) {
				throw new Error('auto-server datainjector: inject object notfound');

			} else if (injectKey.indexOf('.') == -1) {
				injectObject[injectKey] = data;

			} else {
				var temp = injectObject;
				var keys = injectKey.split('.');

				keys.forEach(function (levelkey, i) {
					if (i != keys.length - 1) {
						temp = (temp[levelkey] = temp[levelkey] || {});
					} else {
						// lastone
						temp[levelkey] = data;
					}
				});
			}
		} else {
			extend(injectObject, data);
		}
	}
};