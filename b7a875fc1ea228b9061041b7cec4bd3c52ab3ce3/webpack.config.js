/*global process*/
require('dotenv').config();

var webpack  = require('webpack'),
    debug     = process.env.WP_DEBUG;

module.exports = {
    entry : './assets/js/src/core',
    output : {
        path: './assets/js/dist',
        filename: debug ? 'combined.js' : 'combined.min.js',
    },
    module : {
        loaders : [{
            test: /\.js$/,
            exclude: /(node_modules|bower_components)/,
            loader: 'babel-loader'
        }]
    },
    plugins : debug ? [] : [
        new webpack.optimize.UglifyJsPlugin()
    ]
};
