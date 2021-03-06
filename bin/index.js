#!/usr/bin/env node

// Native
const path = require('path');

// Packages
const micro = require('micro');
const compress = require('micro-compress');
const detect = require('detect-port');
const coroutine = require('bluebird').coroutine;
const updateNotifier = require('update-notifier');
const chalk = require('chalk');
const nodeVersion = require('node-version');
const _ = require('lodash');

// Ours
const pkg = require('../package');
const listening = require('../lib/listening');
const serverHandler = require('../lib/server');
const FunctionalUtils = require('../lib/functional-utils');
const ParseCommandLineArgs = require('../lib/parse-command-line-args');
const logger = require('../lib/logger');

let HtmlPages = {
  server: null
};

// Throw an error if node version is too low
if (nodeVersion.major < 6 || (nodeVersion.major === 6 && nodeVersion.minor < 6)) {
  console.error(
    `${chalk.red('Error!')} ${pkg.title} requires at least version 6.6.0 of Node. Please upgrade!`
  );
  process.exit(1);
}

// Let user know if there's an update
// This isn't important when deployed to production
if (process.env.NODE_ENV !== 'production' && pkg.dist) {
  updateNotifier({
    pkg
  }).notify();
}

const flags = ParseCommandLineArgs();
const directory = flags.root;
let current = process.cwd();

if (directory) {
  current = path.resolve(process.cwd(), directory);
}

process.env.SERVER_PATH = path.join(__dirname, '/../');
process.env.CURRENT_PATH = current;
process.env.ASSET_DIR = path.normalize('/@' + pkg.name + '-internal-files-' + Math.random().toString(36).substr(2, 16));

// Ignore MacOSx files
let ignoredFiles = ['.DS_Store', '._.DS_Store'];

if (flags.ignore && flags.ignore.length > 0) {
  ignoredFiles = ignoredFiles.concat(flags.ignore);
}

HtmlPages.options = flags;

/*
  Define global functions
 */
global.utils = {};
global.utils.logger = logger(flags.logLevel);

if (flags.logLevel === 'debug') {
  global.utils.logger.logDebug(chalk.blue('Options List:'), true);
  // Print default options
  _.each(flags, function (value, key) {
    if (!_.includes(['dryTest', 'onlyLocalhost'], key)) {
      if (key === 'layout' && value === false) {
        value = 'grid';
      }

      const msgKey = '' +
        'Option: `' + chalk.blue(_.lowerCase(key).replace(/ /g, '-')) + '` set to ' +
        '`' + chalk.blue(_.isObject(value) ? JSON.stringify(value) : value) + '`';

      global.utils.logger.logDebug(msgKey, true);
    }
  });
}

// Initialize utils functions
const fu = FunctionalUtils(flags, ignoredFiles);
// Add functional functions to global utils
global.utils = _.merge(global.utils, fu);

const handler = coroutine(function * (req, res) {
  yield serverHandler(req, res, flags, current, fu);
});

HtmlPages.server = flags.unzipped ? micro(handler) : micro(compress(handler));
let port = flags.port;
let host = flags.host;

detect(port).then(open => {
  let inUse = open !== port;

  if (inUse && flags.noPortScan === true) {
    console.error(
      chalk.red(
        'The port `' + port + '` is already in use.'
      )
    );

    process.exit(500);
  }

  if (inUse) {
    port = open;

    inUse = {
      old: flags.port,
      open
    };
  }

  HtmlPages.server.listen(
    port,
    host,
    coroutine(function * () {
      yield listening(HtmlPages.server, current, inUse, flags.noClipboard !== true, fu);
    })
  );

  if (flags.dryTest === true) {
    setTimeout(function () {
      process.emit('kill');
    }, 300);
  }
});

module.exports = HtmlPages;
