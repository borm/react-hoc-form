'use strict';
import path from 'path'
import webpack from 'webpack'
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;

const config = {
  env: process.env.NODE_ENV || 'development',
  source: path.join(__dirname, 'src'),
  output: path.join(__dirname)
};

const { env, source, output } = config;
const isDev = env === 'development';

export default {
  devtool: isDev ? 'source-map' : false,
  externals: {
    'react': {
      root: 'React',
      commonjs2: 'react',
      commonjs: 'react',
      amd: 'react'
    },
    'prop-types': {
      root: 'PropTypes',
      commonjs2: 'prop-types',
      commonjs: 'prop-types',
      amd: 'prop-types'
    },
  },
  context: source,
  resolve: {
    modules: ['node_modules', source],
    extensions: ['.json', '.js']
  },
  entry: './index.js',
  output: {
    path: output,
    filename: `dist/react-hoc-form${isDev ? '.js' : '.min.js'}`,
    library: 'ReactHocForm',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    // pathinfo: true, // isDev
  },
  module: {
    rules: [
      {
        test: /(\.jsx|\.js)$/,
        loader: 'babel-loader',
        exclude: /(node_modules|bower_components)/
      }
    ]
  },
  plugins: (plugins => {
    if (!isDev) {
      plugins = plugins.concat(new webpack.optimize.UglifyJsPlugin({
        compressor: {
          pure_getters: true,
          unsafe: true,
          unsafe_comps: true,
          warnings: false
        }
      }));
    }
    return plugins;
  })([
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(env)
      }
    }),
  ])
};
