'use strict'

/**
 * Dependencies
 * @ignore
 */
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const passport = require('passport')
const session = require('express-session')
const LevelStore = require('level-session-store')(session)

/**
 * Module Dependencies
 * @ignore
 */
const AbstractController = require('./AbstractController')
const User = require('./User')

/**
 * Constants
 * @ignore
 */
const loginFailedMessage = 'Login failed'
const tmpLoginHTML = `
<html>
  <body style="margin: 50px;">
    <h3>Login</h3>
    <form action="/login" method="post">
        <div>
            <label>Username:</label>
            <input type="text" name="username"/>
        </div>
        <div>
            <label>Password:</label>
            <input type="password" name="password"/>
        </div>
        <div>
            <input type="submit" value="Log In"/>
        </div>
    </form>
    <h3>Register</h3>
    <form action="/register" method="post">
        <div>
            <label>Username:</label>
            <input type="text" name="username"/>
        </div>
        <div>
            <label>Password:</label>
            <input type="password" name="password"/>
        </div>
        <div>
            <input type="submit" value="Register"/>
        </div>
    </form>
  </body>
</html>`

/**
 * Authentication
 * @ignore
 */
class Authentication extends AbstractController {

  constructor (settings) {
    super()

    const { data: dataDir, 'bcrypt-rounds': rounds } = settings
    this.rounds = rounds

    // Database setup
    User.setDatabase(`${dataDir}/auth`)

    // Passport setup
    passport.serializeUser(this.serializeSession)
    passport.deserializeUser(this.deserializeSession)
    passport.use(this.strategy)
  }

  get strategy () {
    const { rounds: saltRounds } = this

    return new LocalStrategy((username, password, done) => {
      User.get(username)
        .then(user => {
          if (!user) {
            throw new Error('User not found') // TODO obfuscate message
          }

          return bcrypt.compare(password, user.password_hash)
            .then(result => {
              if (result) {
                return done(null, user)
              }

              throw Error('Incorrect Password')
            })
        })
        .catch(error => done(null, false, { message: error.message }))
    })
  }

  get authenticated () {
    return (req, res, next) => {
      if (req.user) {
        return next()
      }

      res.redirect('/login')
    }
  }

  get loginMiddleware () {
    return passport.authenticate('local')
  }

  get registerMiddleware () {
    return (req, res, next) => {
      const { rounds: saltRounds } = this
      const { username, password: plaintext } = req.body

      if (!username || !plaintext) {
        return next(new Error('Username and Password required'))
      }

      console.log('REGISTER', username)

      Promise.all([
        User.get(username),
        bcrypt.hash(plaintext, Number(saltRounds)),
      ]).then(([exists, hash]) => {
        console.log('HASH', hash)

        if (exists) {
          throw new Error('User already exists')
        }

        const user = new User({ _id: username, password_hash: hash })
        return user.put()
      })
      .then(user => {
        req.login(user, error => {
          if (error) {
            console.error(error)
            throw new Error('Registration failed')
          }

          next()
        })
      })
      .catch(error => res.status(400).json({ error: error.message }))
    }
  }

  get serializeSession () {
    return (user, done) => done(null, user._id)
  }

  get deserializeSession () {
    return (id, done) => User.get(id)
      .then(user => user
        ? done(null, user)
        : done(new Error('User not found')))
      .catch(error => done(error))
  }

  configure (server, { settings }) {
    // Session
    server.use(session({
      secret: settings['cookie-secret'],
      resave: false,
      saveUninitialized: true,
      cookie: { maxAge: 360000 },
      store: new LevelStore(`${settings['data']}/session`),
    }))

    // Passport
    server.use(passport.initialize())
    server.use(passport.session())
  }

  mount (server, { settings }) {
    server.get('/login', (req, res) => res.status(200).send(tmpLoginHTML))
    server.post('/login', this.loginMiddleware, (req, res) => res.status(200).json({ success: true }))
    server.post('/register', this.registerMiddleware, (req, res) => res.status(200).json({ success: true }))
  }
}

/**
 * Exports
 * @ignore
 */
module.exports = Authentication
