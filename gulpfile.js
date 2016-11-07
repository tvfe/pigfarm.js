var gulp = require('gulp');
var uglify = require('gulp-uglify');
var webpack = require('webpack');
var config = require('./webpack.test');

gulp.task('test-release', function (done) {
	webpack(config, function (err, stat) {
		if (err) {
			console.trace(err);
		} else {
			console.log(stat.toString());
		}
		done();
	});
});

// gulp.task('test-release', ['test-build'], function () {
// 	gulp.src('./test/front/bundle.js')
// 		.pipe(uglify())
// 		.pipe(gulp.dest('./test/front/dest'));
// });

gulp.task('default', ['test-release'], function () {
	gulp.watch([
		'./test/front/test.js',
		'./index.js',
		'./lib/**/*.js'
	], ['test-release']);
});