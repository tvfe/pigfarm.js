'use strict';
var asyncDependency = require("../lib/asyncDependencies");
var it = require("ava").test;
var assert = require("assert");

it('', async function () {
	var map = asyncDependency({
		cover: {
			factory: function () {
				return {
					id: 'abc'
				}
			}
		},
		video: {
			dep: ['cover'],
			factory: function (param) {
				assert.equal(param.cover.id, 'abc');
				return new Promise(resolve=> setTimeout(function () {
					resolve({id: 123})
				}, 500))
			}
		},
		videolist: {
			dep: ['cover', 'video'],
			factory: function (param) {
				assert.equal(param.video.id, '123');
				assert.equal(param.cover.id, 'abc');
				return new Promise(resolve=> {
					setTimeout(function () {
						resolve([1, 2, 3]);
					}, 1000)
				})
			}
		}
	});

	map = await map;
	assert.deepEqual(map.cover, {id: 'abc'});
	assert.deepEqual(map.video, {id: 123});
	assert.deepEqual(map.videolist, [1, 2, 3]);
});
