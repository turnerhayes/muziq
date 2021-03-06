/**
 * COMMON WEBPACK CONFIGURATION
 */

require("dotenv").config();
const webpack = require("webpack");
const aliases = require("./aliases");
const Config = require("../../server/lib/config");

// Remove this line once the following warning goes away (it was meant for webpack loader authors not users):
// 'DeprecationWarning: loaderUtils.parseQuery() received a non-string value which can be problematic,
// see https://github.com/webpack/loader-utils/issues/56 parseQuery() will be replaced with getOptions()
// in the next major version of loader-utils.'
process.noDeprecation = true;

module.exports = (options) => ({
  entry: options.entry,
  output: Object.assign({ 
    path: Config.paths.dist,
    publicPath: "/static/",
  }, options.output), // Merge with env dependent settings
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: [
          /node_modules/,
          /^\/projects\/websites\/opensheetmusicdisplay\//,
        ],
        use: [
          {
            loader: "babel-loader",
          },
          "eslint-loader",
        ],
      },
			
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              sourceMap: true,
              importLoaders: 2
            }
          },
          {
            loader: "postcss-loader",
            options: {
              sourceMap: true,
            }
          },
        ],
      },

      {
        // Preprocess 3rd party .css files located in node_modules
        test: /\.css$/,
        include: /node_modules/,
        use: ["style-loader", "css-loader"],
      },

      {
        test: /\.(eot|svg|otf|ttf|woff|woff2)$/,
        use: "file-loader",
      },

      {
        test: /\.xml$/,
        exclude: /node_modules/,
        use: "raw-loader",
      },

      {
        test: /\.(jpg|png|gif)$/,
        use: [
          "file-loader",
          {
            loader: "image-webpack-loader",
            options: {
              mozJpeg: {
                progressive: true,
              },
              optipng: {
                optimizationLevel: 7,
              },
              gifsicle: {
                interlaced: false,
              },
              pngquant: {
                quality: "65-90",
                speed: 4,
              },
            },
          },
        ],
      },

      {
        test: /\.musicxml$/,
        use: "raw-loader",
      },

      {
        test: /\.xsl$/,
        use: "raw-loader",
      },

      {
        test: /\.html$/,
        use: "html-loader",
      },

      {
        test: /\.wav(\?.*)?$/,
        use: "file-loader"
      },

      {
        test: /\.(mp4|webm)$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
          },
        },
      },
    ],
  },
  plugins: options.plugins.concat([
    new webpack.ProvidePlugin({
      // make fetch available
      fetch: "exports-loader?self.fetch!whatwg-fetch",
    }),

    // Always expose NODE_ENV to webpack, in order to use `process.env.NODE_ENV`
    // inside your code for any environment checks; UglifyJS will automatically
    // drop any unreachable code.
    new webpack.EnvironmentPlugin({
      // Necessary environment variables for shared-lib/config
      NODE_ENV: Config.app.environment,
      WEB_SOCKETS_URL: null,
      STATIC_CONTENT_URL: null,

      // Necessary environment variables for social media login integration
      CREDENTIALS_FACEBOOK_IS_ENABLED: Config.auth.facebook.isEnabled || false,
      CREDENTIALS_GOOGLE_IS_ENABLED: Config.auth.google.isEnabled || false,
      CREDENTIALS_TWITTER_IS_ENABLED: Config.auth.twitter.isEnabled || false,
    }),

    new webpack.NamedModulesPlugin(),
  ]),
  resolve: {
    modules: ["app", "node_modules"],
    extensions: [
      ".js",
      ".jsx",
      ".react.js",
    ],
    mainFields: [
      "browser",
      "jsnext:main",
      "main",
    ],
    alias: aliases,
  },
  devtool: options.devtool,
  target: "web", // Make web variables accessible to webpack, e.g. window
  performance: options.performance || {},
});
