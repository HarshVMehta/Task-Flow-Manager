const express = require('express');
const { body } = require('express-validator');
const { getUsers, createMember, removeMember } = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');

const router = express.Router();

// GET /api/users — Admin only
router.get('/', auth, authorize('ADMIN'), getUsers);

// POST /api/users — Admin creates member account
router.post(
  '/',
  auth,
  authorize('ADMIN'),
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
      .optional({ checkFalsy: true })
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
  ],
  validate,
  createMember
);

// DELETE /api/users/:id — Admin removes member from team
router.delete('/:id', auth, authorize('ADMIN'), removeMember);

module.exports = router;
