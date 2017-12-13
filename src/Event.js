'use strict'

/**
 * Dependencies
 * @ignore
 */
const { DocumentModel } = require('@trust/model')

/**
 * Event
 * @ignore
 */
class Event extends DocumentModel {

  static get schema () {
    return super.schema.extend({
      properties: {
        type: { type: 'string' },
        payload: { type: 'object' },
        meta: { type: 'object' },
        error: { type: 'boolean' },
      },
      required: ['type', 'payload'],
    })
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Event
