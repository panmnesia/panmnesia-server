'use strict'

/**
 * Command
 * @ignore
 */
class Command {

  constructor (req, res, next) {
    this.req = req
    this.res = res
    this.next = next

    const { req: { body: params, user, state } } = this
    this.params = params
    this.user = user
    this.state = state
  }

  static get type () {
    throw new Error('Must be overriden')
  }

  static authorize () {
    throw new Error('Must be overriden')
  }

  static destination () {
    throw new Error('Must be overriden')
  }

  static handle (database, req, res, next) {
    const ExtendedCommand = this
    const command = new ExtendedCommand(req, res, next)

    return Promise.resolve()
      .then(() => command.authorize())
      .then(() => command.dispatch(database))
      .then(() => command.complete())
      .catch(error => {
        if (error) {
          next(error)
        }
      })
  }

  authorize () {
    const { state, user, params, res, constructor: ExtendedCommand } = this

    return Promise.resolve()
      .then(() => ExtendedCommand.authorize(state, params, user))
      .then(result => {
        if (!result) {
          this.unauthorized()
          return Promise.reject()
        }
      })
  }

  dispatch (database) {
    const { state, user, params, constructor: ExtendedCommand } = this
    const destination = ExtendedCommand.destination(user)

    if (typeof destination !== 'object' || destination === null) {
      throw new Error(`'destination' must return an Object`)
    }

    return Promise.all(Object.entries(destination).map(([mapperName, database]) =>
      Promise.resolve()
        // Map event to per-database commands
        .then(() => ExtendedCommand[mapperName](state, params, user))

        // Rearrange for committing to to database
        .then(command => [database, command])
        .catch(error => Promise.reject(new Error(`${ExtendedCommand.name}.${mapperName}(...) is not a function`)))

    // Commit commands to relevant databases
    )).then(commands => Promise.all(commands.map(args => database.emit(...args))))
  }

  complete () {
    const { res } = this
    res.status(200).end()
  }

  forbidden () {
    const { res } = this
    res.status(403).send('<pre>Forbidden</pre>')
  }

  unauthorized () {
    const { res } = this
    res.status(401).send('<pre>Unauthorized</pre>')
  }

  badRequest () {
    const { res } = this
    res.status(400).send('<pre>Bad Request</pre>')
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Command
