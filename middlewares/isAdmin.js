function isAdmin(req, res, next) {
  // Make sure the user is authenticated and has admin rights
  if (req.user && req.isAdmin === true) {
    return next(); // Proceed if admin
  }

  return res.status(403).send('Access denied. Admins only.');
}

module.exports = isAdmin;