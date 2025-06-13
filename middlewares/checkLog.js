const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.cookies.token;
  const loggedIn = req.cookies.loggedIn;

  if (!token) {
    return res.redirect('/login'); // Or show an unauthorized page
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    req.user = decoded; // Attach user data to request
    req.loggedIn = loggedIn; // Attach loggedIn status to request
    next();
  } catch (err) {
    res.clearCookie('token');
    res.clearCookie('loggedIn');
    req.cookies.token = null; // Clear the token cookie
    console.error('Token verification failed:', err);
    req.loggedIn = false; // Ensure loggedIn is set to false if token verification fails
    req.user = null; // Ensure user is set to null if token verification fails
    return res.redirect('/login'); // Token expired or invalid
  }
}

module.exports = authenticateToken;
// This middleware checks if the user is authenticated by verifying the JWT token.