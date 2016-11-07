if (typeof Promise == 'undefined') {
    module.exports = require('es6-promise');
} else {
	module.exports = Promise;
}