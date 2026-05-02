const jwt = require('jsonwebtoken');

/**
 * Generate a JWT token for a user
 */
const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Format user object (strip password)
 */
const formatUser = (user) => {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

module.exports = { generateToken, formatUser };
