const jwt = require('jsonwebtoken');
const SECRET_KEY = 'your-secret-key'; // In production, use environment variables

// Simple user database (in production, use a real database)
const users = [
  { id: 1, username: 'admin', password: '1234', role: 'admin' },
  { id: 2, username: 'user', password: '1234', role: 'user' }
];

const authenticate = (username, password) => {
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    return { success: true, user: { id: user.id, username: user.username, role: user.role } };
  } else {
    return { success: false, message: 'Invalid credentials' };
  }
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET_KEY,
    { expiresIn: '1h' }
  );
};

const verifyToken = (token) => {
  try {
    return { success: true, data: jwt.verify(token, SECRET_KEY) };
  } catch (error) {
    return { success: false, message: 'Invalid token' };
  }
};

module.exports = { authenticate, generateToken, verifyToken };
