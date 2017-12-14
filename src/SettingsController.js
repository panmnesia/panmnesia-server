'use strict'

/**
 * Dependencies
 * @ignore
 */
const fs = require('fs')
const path = require('path')
const yargs = require('yargs')
const { JSONSchema, JSONMapping } = require('@trust/json-document')

/**
 * Module Dependencies
 * @ignore
 */
const AbstractController = require('./AbstractController')

/**
 * Settings Controller
 * @ignore
 */
class SettingsController extends AbstractController {

  /**
   * Constructor
   */
  constructor (schema, computed) {
    super()

    // set the schema as non-enumerable property
    Object.defineProperty(this, 'schema', { value: new JSONSchema({ properties: schema }) })

    // set the computation instructions as non-enumerable property
    Object.defineProperty(this, 'computed', { value: computed })

    // generate a mapping from the schema and set as non-enumerable
    Object.defineProperty(this, 'mapping', {
      enumerable: false,
      value: new JSONMapping(
        Object
          .keys(schema)
          .reduce((result, key) => {
            let pointer = `/${key}`
            result[pointer] = pointer
            return result
          }, {})
      )
    })

    // load the results
    this.refresh()
  }

  /**
   * refresh
   *
   * @description Reread the values
   */
  refresh () {
    const { schema, mapping, computed = {} } = this

    const fileData = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8')
      .split('\n')
      .map(item => item.split('='))
      .reduce((state, [key, value]) => {
        if (key) {
          state[key] = value
        }
        return state
      }, {})

    yargs
      .env('PAN')
      .version()
      .alias('version', 'v')
      .options(schema.properties)
      .help('help')
      .epilogue('Panmnesia Server')

    mapping.map(this, yargs.argv)
    mapping.map(this, fileData)

    Object.entries(computed)
      .forEach(([key, fn]) => this[key] = fn(this))
  }

  /**
   * save
   *
   * @description Persist to .env file
   */
  save () {
    const envData = Object.entries(this).map(([key, value]) => `${key}=${value}`).join('\n')
    fs.writeFileSync(path.join(process.cwd(), '.env'), envData, { mode: 0o600 })
  }

  /**
   * mount
   */
  mount (server) {
    server.use((req, res, next) => {
      req.config = this
      next()
    })
  }
}

/**
 * Export
 */
module.exports = SettingsController
