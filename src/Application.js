'use strict'

/**
 * Dependencies
 * @ignore
 */
require('dotenv').config()
const cwd = process.cwd()
const express = require('express')
const bodyParser = require('body-parser')
const debug = require('debug')
const os = require('os')
const crypto = require('crypto')
const path = require('path')
const glob = require('glob')

/**
 * Loggers
 * @ignore
 */
const logger = debug('app:bootstrapper')

/**
 * Module Dependencies
 * @ignore
 */
const AbstractController = require('./AbstractController')
const SettingsController = require('./SettingsController')
const AuthenticationController = require('./AuthenticationController')
const DatabaseController = require('./DatabaseController')
const CommandController = require('./CommandController')
const StateController = require('./StateController')

/**
 * Constants
 * @ignore
 */
const defaultSettingsConfig = {
  'host': {
    type: 'string',
    alias: 'h',
    default: 'localhost',
    describe: 'Host of the server process'
  },

  'port': {
    alias: 'p',
    default: 3000,
    describe: 'Port of the server process',
    type: 'number'
  },

  'data': {
    alias: 'd',
    default: 'data',
    describe: 'Path to locally persisted data'
  },

  'max-processes': {
    alias: 'm',
    default: os.cpus().length,
    describe: 'Maximum number of workers',
    type: 'number'
  },

  'https-cert': {
    type: 'string',
    default: path.join('certs', 'cert.crt'),
    describe: 'Path to SSL Certificate'
  },

  'https-key': {
    type: 'string',
    default: path.join('certs', 'cert.key'),
    describe: 'Path to SSL Private Key'
  },

  'http-only': {
    type: 'boolean',
    default: true,
    describe: 'Run the server without SSL'
  },

  'cookie-secret': {
    type: 'string',
    default: crypto.randomBytes(10).toString('hex'),
    describe: 'Session key entropy'
  },

  'log-level': {
    default: 'info',
    describe: 'Log level'
  },

  'bcrypt-rounds': {
    type: 'number',
    default: 10,
    describe: 'Salt rounds for bcrypt password hashing'
  },

  'db-host': {
    type: 'string',
    default: 'localhost',
    describe: 'Host of remote couchdb instance'
  },

  'db-port': {
    type: 'number',
    default: 5984,
    describe: 'Port of remote couchdb instance'
  },

  'db-table-prefix': {
    type: 'string',
    default: 'panmnesia_',
    describe: 'Prefix all tables created in the couchdb instance.'
  },

  'db-admin-user': {
    type: 'string',
    default: undefined,
    describe: 'Username of remote couchdb admin user'
  },

  'db-admin-password': {
    type: 'string',
    default: undefined,
    describe: 'Password of remote couchdb admin user'
  }
}

const defaultComputedConfig = {
  issuer: settings => {
    const { host, port, 'http-only': http } = settings
    const scheme = http ? 'http' : 'https'
    return port === 443 || port === 80
      ? `${scheme}://${host}`
      : `${scheme}://${host}:${port}`
  },

  'db-remote': settings => {
    const { host, 'db-host': dbhost, 'db-port': dbport, 'http-only': http } = settings
    const scheme = http ? 'http' : 'https'
    return `${scheme}://${dbhost}:${dbport}`
  }
}

/**
 * Application
 * @ignore
 */
class Application extends AbstractController {

  constructor (config) {
    super()

    this.server = express()

    let {
      commands = 'commands',
      reducers = 'reducers',
      enhancer,
    } = config

    // Normalize Commands
    if (typeof commands === 'string') {
      try {
        commands = glob.sync(path.join(cwd, commands, '**/*.js')).map(filePath => require(filePath))
      } catch (error) {
        console.error(error)
        process.exit(1)
      }
    }

    // Normalize Reducers
    if (typeof reducers === 'string') {
      try {
        reducers = glob.sync(path.join(cwd, reducers, '**/*.js'))
          .map(filePath => require(filePath))
          .reduce((state, {type, reducer}) => ({
            ...state,
            [type]: reducer,
          }), {})
      } catch (error) {
        console.error(error)
        process.exit(1)
      }
    }

    // Configure Settings
    let settingsConfig = { ...defaultSettingsConfig, ...(config.settingsConfig || {}) }
    let computedConfig = { ...defaultComputedConfig, ...(config.computedConfig || {}) }
    const settings = new SettingsController(settingsConfig, computedConfig)
    settings.save()

    // Controllers
    this.lifecycle = {
      app: this,
      settings,
      auth: new AuthenticationController(settings),
      database: new DatabaseController(settings),
      commands: new CommandController(settings, commands),
      state: new StateController(reducers, enhancer),
    }
  }

  static init (commands) {
    const app = new Application(commands)

    return Promise.resolve()
      .then(() => app.phase('configure'))
      .then(() => app.phase('initialize'))
      .then(() => app.phase('mount'))
      .then(() => app.phase('listen'))
      .catch(error => {
        console.error(error)
        process.exit(1)
      })
  }

  get controllers () {
    return Object.values(this.lifecycle)
  }

  phase (name) {
    const { server, lifecycle } = this
    return Promise.all(this.controllers.map(item => item[name](server, lifecycle)))
  }

  configure (server) {
    // standard utility Express middleware
    server.use(bodyParser.json())
    server.use(bodyParser.urlencoded({ extended: true }))
  }

  mount (server, { auth }) {
    // Debug Endpoints
    server.get('/', (req, res) => res.status(200).json({ foo: 'bar' }))
    server.get('/authed', auth.authenticated, (req, res) => res.status(200).json({ success: true }))
  }

  listen (server, { settings }) {
    const { port } = settings

    return server.listen(port, () => console.log(`App listening on port ${port}.`))
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Application
