module.exports = {
	entry: './test/front/test.js',
	output: {
		path: './test/front',
		filename: 'bundle.js'
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				query: {
					presets: [
						'es2015'
					]
				}
			}
		]
	}
};