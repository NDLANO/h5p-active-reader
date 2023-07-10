const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');

const mode = process.argv.includes('--mode=production') ?
  'production' : 'development';
const libraryName = process.env.npm_package_name;

module.exports = {
  mode: mode,
  context: path.resolve(__dirname, 'src'),
  entry: {
    dist: './entries/main.js'
  },
  output: {
    filename: `${libraryName}.js`,
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  target: ['browserslist'],
  optimization: {
    minimize: mode === 'production',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress:{
            drop_console: true,
          }
        }
      }),
    ],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.(s[ac]ss|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: ''
            }
          },
          { loader: "css-loader" },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.svg|\.eot|\.woff2|\.woff|\.ttf$/,
        include: path.join(__dirname, 'src/fonts'),
        type: 'asset/resource'
      }
    ]
  },
  stats: {
    colors: true,
    children: true,
    errorDetails: true
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: `${libraryName}.css`
    })
  ],
  externals: {
    jquery: 'H5P.jQuery'
  },
  ...(mode !== 'production' && { devtool: 'eval-cheap-module-source-map' })
};
