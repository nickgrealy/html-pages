// Native
const path = require('path');

// Packages
const mlog = require('mocha-logger');
const _ = require('lodash');
const sleep = require('thread-sleep');

const options = {
  port: 8888,
  'no-browser': true,
  'no-clipboard': true,
  'no-notifications': true,
  'no-port-scan': true,
  silent: true
};

const startServer = (opts = {}, dirname) => {
  opts = _.merge({}, options, opts);

  if (dirname === undefined) {
    dirname = path.join(__dirname, 'data');
  }

  const htmlPages = require('../lib/api')(dirname, opts);
  const httpHost = 'http://localhost:' + htmlPages.options.port;

  sleep(2000);

  return {
    htmlPages,
    httpHost
  };
};

const parseResponse = (response, debug) => {
  if (debug !== true) {
    return false;
  }

  mlog.log('response', Object.keys(response));
  mlog.log('status', response.status);
  mlog.log('statusCode', response.statusCode);

  for (const _header in response.headers) {
    mlog.log('_header', _header, response.headers[_header]);
  }
};

module.exports = {
  startServer,
  parseResponse
};
