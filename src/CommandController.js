'use strict'

/**
 * Dependencies
 * @ignore
 */

/**
 * Module Dependencies
 * @ignore
 */
const AbstractController = require('./AbstractController')

/**
 * Command Controller
 * @ignore
 */
class CommandController extends AbstractController {

  constructor (settings, commands) {
    super()

    this.settings = settings
    this.commands = commands

    // Index Commands by Type
    this.typeIndex = commands.reduce((state, command) => {
      state[command.type] = command
      return state
    }, {})
  }

  handle (req, res, next) {
    const { database, state } = this
    const { body = {} } = req
    const { type, payload, meta } = body

    if (!type) {
      next(new Error(`'type' is required by flux-standard-action`))
    }

    if (!payload) {
      next(new Error(`'payload' is required by flux-standard-action`))
    }

    if (typeof payload !== 'object' || payload === null) {
      next(new Error(`'payload' must be an object`))
    }

    const Command = this.typeIndex[type]

    if (!Command) {
      next(new Error(`Invalid type`))
    }

    return Command.handle(database, req, res, next)
  }

  configure (server, { database }) {
    this.database = database
  }

  mount (server, { auth }) {
    server.post('/command', auth.authenticated, (req, res, next) => this.handle(req, res, next))
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = CommandController
