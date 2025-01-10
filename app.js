const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('./db');
const User = require('./models/User');
const Session = require('./models/Session');
const app = express();
const port = 3000;

// Role configuration
const roles = {
  admin: {
    permissions: ['read', 'write', 'delete', 'manage_users'],
    routes: ['/admin/*', '/users/*', '/protected']
  },
  user: {
    permissions: ['read'],
    routes: ['/protected']
  },
  moderator: {
    permissions: ['read', 'write'],
    routes: ['/protected', '/users/*']
  }
};

// Role-based access control middleware
const checkRole = (requiredRole) => {
  return async (req, res, next) => {
    const userRole = req.role;
    
    if (!userRole || !roles[userRole]) {
      return res.status(403).send('Unauthorized role');
    }

    const userPermissions = roles[userRole].routes;
    const requestPath = req.path;

    const hasAccess = userPermissions.some(route => {
      const regexRoute = route.replace('*', '.*');
      return new RegExp(`^${regexRoute}$`).test(requestPath);
    });

    if (!hasAccess) {
      return res.status(403).send('Access denied');
    }

    next();
  };
};

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
  if (!session[0]) {
    return res.status(401).send('Unauthorized');
    
  }
  req.user_id = session[0].user_id;
  const user = await User.findOne({ _id: req.user_id });
  console.log(user);
  console.log(user.role);
  req.role = user.role;
  
  
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
    const role = 'admin';
    const newUser = new User({ username, password,role });
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

// Protected routes with RBAC
app.get('/protected', tokenMiddleware, checkRole('user'),async (req, res) => {
  const u_id = req.body.user_id;
  const user = await User.findOne({ _id: u_id });

  res.send('Protected route for user: ' + user);
});

app.get('/admin/dashboard', tokenMiddleware, checkRole('admin'), (req, res) => {
  res.send('Admin dashboard');
});

app.get('/users/manage', tokenMiddleware, checkRole('moderator'), (req, res) => {
  res.send('User management');
});

module.exports = app;
