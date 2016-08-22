'use strict';
var hrtime = require("@tencent/process.hrtime");
/**
 * timeline-liked logger
 *
 * var tl = createTimeline();
 * tl.start('cover');
 * tl.end('cover'); // xxx (ms)
 * tl.start('video');
 * tl.end('video'); // xxx (ms)
 *
 * for (item of tl) {
 *  console.log(item); // {name: cover, start: timestamp, end: timestamp, duration: ms}
 * }
 */
function createTimeline() {
	let items = {};

    return {
	    start(key, value) {
		    let now = value || hrtime();
		    items[key] = {name: key, start: now, end: now, duration: 0};

		    return key;
	    },

	    end(key, value) {
		    items[key].end = value || hrtime();
		    items[key].duration = hrtime(items[key].start);

		    return items[key].duration;
	    },

	    [Symbol.iterator]() {
		    var keys = Object.keys(items);
		    var index = 0;

		    return {
			    next() {
				    return {
					    value: items[keys[index]],
					    done: index++ == keys.length
				    }
			    }
		    }
	    }
    };
}

module.exports = createTimeline;