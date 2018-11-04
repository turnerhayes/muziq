# muziq


# Technical structure

State is stored in a [MongoDB](https://mongodb.com) database. The server uses [Express](http://expressjs.com/) and builds its static content (CSS/JS) via [Webpack](https://webpack.github.io/).

The frontend is a [ReactJS](https://facebook.github.io/react/)/[Redux](http://redux.js.org/) web application and uses [CSS-in-JS](http://cssinjs.org) for styling.

# Installation

Clone this repo and run `npm install` from within its root directory.

# Configuration

The application requires a few things at minimum to run correctly. Configuration values are set via a [.env](https://github.com/motdotla/dotenv) file. A sample file with the relevant keys is available at `.env.example`.

## Database

The app uses a [MongoDB](https://www.mongodb.com/) database to back its sessions, game state, etc. There are a couple of keys in the .env file relevant to the database:

- `CREDENTIALS_DB_URL`: this should be a [MongoDB connection string uri](https://docs.mongodb.com/manual/reference/connection-string/) to the database where the application data is stored (game state, user profiles, etc.)

- `SESSION_DB_URL`: this should be a connection string to the database where the session data is stored. This can be the same as `CREDENTIALS_DB_URL`; if it's not specified, it will default to be the same.


## SSL

The application can be served with or without SSL. To serve it over SSL, specify the following `.env` variables:

- `APP_SSL_KEY`: a file path to an SSL key file
- `APP_SSL_CERT`: a file path to an SSL cert file

See [here](https://devcenter.heroku.com/articles/ssl-certificate-self) for instructions on how to create self-signed SSL keys and certificates--these are fine for development, but not good for production purposes.


## Sessions

In addition to the `SESSION_DB_URL` setting, you must also set the `SESSION_SECRET` setting; this is used to encrypt secure cookies.


## Static content

"Static content" refers to things like Javascript files, CSS stylesheets, images, sound files, etc. It can be served from the same server that serves the rest of the application, or from a separate server, such as a CDN. If you don't want to bother with that, you can leave the `STATIC_CONTENT_URL` setting empty. Otherwise, set it to the base URL for your static content server.

## Running the app

For development purposes, just run `npm start` with the `$NODE_ENV` environment variable set to `development` or not set at all. This will start a server on `localhost` on the port specified by the `$PORT` environment variable, defaulting to `4000`if not specified. The server includes a [Webpack dev server](https://webpack.js.org/guides/development/#using-webpack-dev-server) instance that watches for changes to static content and automatically recompiles them and triggers a reload of the browser.

For production purposes, build a production bundle via `npm run build` and start the server by running `npm start` with the `$NODE_ENV` environment variable set to `production`.


## Other Configuration Values

There are some other configuration options you can set in your `.env` file, including options for logging and social login flows like Facebook and Twitter. For descriptions of these options, look at the [example .env file](.env.example).
