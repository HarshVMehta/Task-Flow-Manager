const express = require('express');
const { body } = require('express-validator');
const { signup, login, getMe } = require('../controllers/authController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// POST /api/auth/signup — Admin registration
router.post(
  '/signup',
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required.')
      .isLength({ max: 100 })
      .withMessage('Name must be under 100 characters.'),
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
  ],
  validate,
  signup
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  validate,
  login
);

// GET /api/auth/me — Protected
router.get('/me', auth, getMe);

module.exports = router;
