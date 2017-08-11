'use strict';

var path = require('path');

module.exports = {
  entry: {
    'mure-ui.es': './index.js'
  },
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'build'),
    filename: '[name].js'
  },
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
