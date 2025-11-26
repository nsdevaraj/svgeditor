const path = require('path');
const webpack = require('webpack');
module.exports = {
  mode: "development",
  entry: [	
  './jquery/jquery-3.2.1.js','./library/leaflet.js','./library/leaflet.draw.js','./library/L.Control.HtmlLegend.js',
	'./library/l.ellipse.min.js','./markers/leaflet.scn-designstudio-markers.js','./lodash/lodash.js','./editor.js',
  './css/font-awesome.min.css',
	'./library/leaflet.css',
	'./css/bootstrap.min.css',
	'./markers/leaflet.scn-designstudio-markers.css',
	'./css/styles.css'
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
	  { test: /\.(png|woff|woff2|eot|ttf|svg)$/, loader: 'url-loader?limit=100000' }
    ]
  },
  resolve: {
    extensions: ['.js','.css' ]
  },
  plugins: [
    new webpack.ProvidePlugin({
         $: "./jquery/jquery-3.2.1.js",
         jQuery: "./jquery/jquery-3.2.1.js"
     })
 ],
  output: {
    filename: 'editor-bundle.js',
    path: path.resolve(__dirname, './build')
  }
};