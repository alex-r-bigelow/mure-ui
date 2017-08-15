'use strict';

var path = require('path');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    'webpack-bundle': './index.js'
  },
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'docs'),
    filename: '[name].js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
      inject: 'body'
    })
  ],
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.html$/,
        loader: 'html-loader',
        query: {
          attrs: ['img:src', 'link:href']
        }
      },
      {
        test: /\.jpe?g$|\.gif$|\.png$|(?!template\b)\b\w+\.svg$|\.woff$|\.ttf$|\.wav$|\.mp3$/,
        loader: 'url-loader'
      },
      {
        test: /template\.svg$/,
        loader: 'html-loader',
        query: {
          attrs: ['image:xlink:href', 'image:href']
        }
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      }
    ]
  }
};
