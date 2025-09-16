const { verifyToken } = require('./auth');

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token required' });
  }

  const result = verifyToken(token);
  if (!result.success) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }

  req.user = result.data;
  next();
};

// Authorization middleware for role-based access
const authorizeRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRole };