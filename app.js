const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./db');
const User = require('./models/User');
const Session = require('./models/Session');
const app = express();
const port = 3000;

// Connect to database
connectDB();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware to check login
const loginMiddleware = async (req, res, next) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    const session = new Session({ user_id: user._id });
    await session.save();
    req.session_id = session._id; // Pass session_id to the next middleware
    next();
  } else {
    res.status(401).send('Unauthorized');
  }
};

// Middleware to check token
const tokenMiddleware = async (req, res, next) => {
  const authToken = req.headers['authtoken'];
  const session = await Session.find({"_id":authToken});
  // console.log(session);
  req.user_id = session[0].user_id;
  
  if (session) {
    next();
  } else {
    res.status(403).send('Forbidden');
  }
};

app.get('/', (req, res) => {
  res.send('Hello, ');
});

app.get('/signup', (req, res) => {
  res.send(`
    <form method="POST" action="/signup">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Sign Up</button>
    </form>
  `);
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  try {
    const newUser = new User({ username, password });
    await newUser.save();
    res.send('Signup successful!');
  } catch (err) {
    res.status(400).send('Error: ' + err.message);
  }
});

app.get('/login', (req, res) => {
  res.send(`
    <form method="POST" action="/login">
      <input type="text" name="username" placeholder="Username" required />
      <input type="password" name="password" placeholder="Password" required />
      <button type="submit">Login</button>
    </form>
  `);
});

app.post('/login', loginMiddleware, (req, res) => {
  res.send(`Login successful! Your token is: ${req.session_id}`);
});

// Protected route
app.get('/protected', tokenMiddleware, (req, res) => {
  // user_id
  res.send('user_id'+ req.user_id);
});


module.exports = app;
