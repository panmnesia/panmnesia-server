'use strict'

/**
 * Dependencies
 * @ignore
 */
const uuid = require('uuid/v1')

/**
 * Identifier
 * @ignore
 */
const createIdentifier = () => {
  const id = uuid().split('-')
  return [id[2], id[1], id[0], id[3], id[4]].join('')
}

/**
 * Exports
 * @ignore
 */
module.exports = createIdentifier
