const { createBullBoard } = require('@bull-board/api');

const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const Queue = require('bull');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { ensureLoggedIn } = require('connect-ensure-login');
const express = require('express');

if (!process.env.QUEUES) {
  console.log('Please provide queue names');
  console.log('Example: QUEUES="events" PASSWORD=123 bull-board-simple');
  return;
}

const QUEUE_NAMES = process.env.QUEUES.split(' ').map(t=>t.trim()).filter(t=>t!== '');
const PASSWORD = process.env.PASSWORD || '123456'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || ''

const PREFIX = process.env.PREFIX; 

// Configure the local strategy for use by Passport.
//
// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
// Default password = 123456
passport.use(
  new LocalStrategy(function (username, password, cb) {
    if (username === 'admin' && password === PASSWORD) {
      return cb(null, { user: 'bull-board' });
    }
    return cb(null, false);
  }),
);

// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  The
// typical implementation of this is as simple as supplying the user ID when
// serializing, and querying the user record by ID from the database when
// deserializing.
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

const redisOptions = {
  port: REDIS_PORT,
  host: REDIS_HOST,
  password: REDIS_PASSWORD,
  tls: false,
};

const createQueue = (queueName, prefix = undefined) => {
  return new Queue(queueName, {
    redis: redisOptions,
    prefix,
  });
};

const run = async () => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/ui');

  createBullBoard({
    queues: QUEUE_NAMES.map((name) => new BullAdapter(createQueue(name, PREFIX))),
    serverAdapter,
  });

  const app = express();
  // Configure view engine to render EJS templates.
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');

  app.use(session({ secret: 'keyboard cat' }));
  app.use(bodyParser.urlencoded({ extended: false }));

  // Initialize Passport and restore authentication state, if any, from the session.
  app.use(passport.initialize({}));
  app.use(passport.session({}));

  app.get('/ui/login', (req, res) => {
    res.render('login');
  });

  app.post(
    '/ui/login',
    passport.authenticate('local', { failureRedirect: '/ui/login' }),
    (req, res) => {
      res.redirect('/ui');
    },
  );

  app.use(
    '/ui',
    ensureLoggedIn({ redirectTo: '/ui/login' }),
    serverAdapter.getRouter(),
  );

  app.listen(3210, () => {
    console.log('Running on 3210...');
    console.log('For the UI, open http://localhost:3210/ui');
    console.log('Username: admin');
    console.log(`Password: ${PASSWORD}`);
  });
};

// eslint-disable-next-line no-console
run().catch((e) => console.error(e));

