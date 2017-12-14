'use strict'

/**
 * Dependencies
 * @ignore
 */
const { createStore } = require('redux')

/**
 * Module Dependencies
 * @ignore
 */
const AbstractController = require('./AbstractController')

/**
 * State Controller
 * @ignore
 */
class StateController extends AbstractController {

  constructor (reducers, enhancer) {
    super()
    this.reducers = reducers
    this.store = createStore((state, event) => this.reduce(state, event), {}, enhancer)
  }

  get state () {
    return this.store.getState()
  }

  reduce (state, event) {
    const { type } = event
    const reducer = this.reducers[type]

    if (reducer) {
      return reducer(state, event)
    }

    return state
  }

  changes (Event) {
    const { name } = Event
    const changes = Event.setChanges({ live: true, include_docs: true, since: 0 })
    changes.on('change', change => this.store.dispatch(change.doc))
  }

  configure (server) {
    server.use((req, res, next) => {
      req.state = this.state
      next()
    })
  }
}

/**
 * Export
 * @ignore
 */
module.exports = StateController
