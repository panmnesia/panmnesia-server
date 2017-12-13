'use strict'

/**
 * Dependencies
 * @ignore
 */
const { DocumentModel } = require('@trust/model')

/**
 * User
 * @ignore
 */
class User extends DocumentModel {

  static get schema () {
    return super.schema.extend({
      properties: {
        password_hash: { type: 'string' },
      }
    })
  }

  get username () {
    return this._id
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = User
