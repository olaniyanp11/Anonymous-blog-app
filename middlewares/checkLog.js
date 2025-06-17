const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Ensure this is correctly imported

async function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect('/login'); // No token, redirect to login
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded;

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    req.loggedIn = true;
    req.isAdmin = user.isAdmin || false;
    

    console.log('✅ User authenticated:', user.username);
    next();

  } catch (err) {
    console.error('❌ Token verification failed:', err.message);
    res.clearCookie('token');
    res.clearCookie('loggedIn');
    req.user = null;
    req.loggedIn = false;
    req.isAdmin = false;

    return res.redirect('/login');
  }
}

module.exports = authenticateToken;
