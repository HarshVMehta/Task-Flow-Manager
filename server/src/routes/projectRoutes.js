const express = require('express');
const { body } = require('express-validator');
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
} = require('../controllers/projectController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');

const router = express.Router();

// POST /api/projects — Admin only
router.post(
  '/',
  auth,
  authorize('ADMIN'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Project name is required.')
      .isLength({ max: 200 })
      .withMessage('Project name must be under 200 characters.'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must be under 2000 characters.'),
  ],
  validate,
  createProject
);

// GET /api/projects
router.get('/', auth, getProjects);

// GET /api/projects/:id
router.get('/:id', auth, getProject);

// PUT /api/projects/:id — Admin only
router.put(
  '/:id',
  auth,
  authorize('ADMIN'),
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Project name cannot be empty.')
      .isLength({ max: 200 })
      .withMessage('Project name must be under 200 characters.'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must be under 2000 characters.'),
  ],
  validate,
  updateProject
);

// DELETE /api/projects/:id — Admin only
router.delete('/:id', auth, authorize('ADMIN'), deleteProject);

// POST /api/projects/:id/members — Admin only
router.post(
  '/:id/members',
  auth,
  authorize('ADMIN'),
  [body('userId').notEmpty().withMessage('User ID is required.').isUUID().withMessage('Invalid user ID.')],
  validate,
  addMember
);

// DELETE /api/projects/:id/members/:userId — Admin only
router.delete('/:id/members/:userId', auth, authorize('ADMIN'), removeMember);

module.exports = router;
