/**
 * Dependencies
 * @ignore
 */
const chai = require('chai')
const sinon = require('sinon')
const sinonChai = require('sinon-chai')
const chaiAsPromised = require('chai-as-promised')
const expect = chai.expect

/**
 * Assertions
 * @ignore
 */
chai.should()
chai.use(sinonChai)
chai.use(chaiAsPromised)

/**
 * Test code
 * @ignore
 */
const { Application, Command } = require('../src')

/**
 * Application
 */

describe('Application', () => {
  it('should set up correctly')
})
