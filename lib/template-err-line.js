'use strict';
/**
 * output the nearline of the error
 *
 * @param error
 * @param templateLines  the template content split with \n
 * @returns {string}
 */
module.exports = function (error, templateLines) {
	var near = '';
	try {
		var line = error.stack.split('\n')[1].split(':')[1] - 1;
		near = '';
		for(var i = Math.max(0, line - 2); i < Math.min(templateLines.length, line + 3); i++) {
			near += ((i + 1) + (line == i ? ' >' : '  ')  + ' | ') + templateLines[i] + '\n';
		}
	} catch(e){}

	return near;
};