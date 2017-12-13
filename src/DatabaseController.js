'use strict'

/**
 * Dependencies
 * @ignore
 */

/**
 * Module Dependencies
 * @ignore
 */
const identifier = require('./identifier')
const Event = require('./Event')
const AbstractController = require('./AbstractController')

/**
 * Database Controller
 * @ignore
 */
class DatabaseController extends AbstractController {

  constructor (settings) {
    super()
    this.settings = settings
    this.events = {}
  }

  get (name) {
    if (!this.events[name]) {
      const {
        state,
        settings: {
          data: dataDir,
          'db-remote': remote,
          'db-table-prefix': prefix,
          'db-admin-user': username,
          'db-admin-password': password
        },
      } = this

      // Create Event Model
      class ExtendedEvent extends Event {
        static get name () { return name }
      }

      // Configure databases
      ExtendedEvent.setDatabase(`${dataDir}/${name}`.toLowerCase())
      ExtendedEvent.setSync({ name: `${remote}/${prefix}${name}`.toLowerCase(), auth: { username, password } })
      state.changes(ExtendedEvent)
      this.events[name] = ExtendedEvent
    }

    return Promise.resolve(this.events[name])
  }

  emit (database, event) {
    const _id = identifier()

    return Promise.resolve()
      .then(() => this.get(database))
      .then(ExtendedEvent => ExtendedEvent.put({ ...event, _id }))
  }

  configure (server, { state }) {
    this.state = state
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = DatabaseController
