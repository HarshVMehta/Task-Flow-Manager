const express = require('express');
const { body } = require('express-validator');
const {
  createTask,
  getProjectTasks,
  getMyTasks,
  getTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');
const validate = require('../middleware/validate');

const router = express.Router();

const parseLocalDate = (value) => {
  if (typeof value === 'string' && value.length === 10) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
};

const validateDueDateNotPast = body('dueDate')
  .optional({ checkFalsy: true })
  .isISO8601()
  .withMessage('Due date must be a valid date.')
  .custom((value) => {
    const dueDate = parseLocalDate(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      throw new Error('Due date cannot be in the past.');
    }
    return true;
  });

// GET /api/tasks/my — Current user's tasks
router.get('/my', auth, getMyTasks);

// GET /api/tasks/:id
router.get('/:id', auth, getTask);

// PUT /api/tasks/:id
router.put(
  '/:id',
  auth,
  [
    body('title')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Task title cannot be empty.')
      .isLength({ max: 300 })
      .withMessage('Title must be under 300 characters.'),
    body('status')
      .optional()
      .isIn(['TODO', 'IN_PROGRESS', 'DONE'])
      .withMessage('Status must be TODO, IN_PROGRESS, or DONE.'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH'])
      .withMessage('Priority must be LOW, MEDIUM, or HIGH.'),
    validateDueDateNotPast,
    body('assignedTo')
      .optional({ checkFalsy: true })
      .isUUID()
      .withMessage('Invalid user ID for assignment.'),
  ],
  validate,
  updateTask
);

// DELETE /api/tasks/:id — Admin only
router.delete('/:id', auth, authorize('ADMIN'), deleteTask);

// Project-scoped task routes
// POST /api/projects/:projectId/tasks — Admin only
router.post(
  '/project/:projectId',
  auth,
  authorize('ADMIN'),
  [
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Task title is required.')
      .isLength({ max: 300 })
      .withMessage('Title must be under 300 characters.'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description must be under 5000 characters.'),
    body('priority')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH'])
      .withMessage('Priority must be LOW, MEDIUM, or HIGH.'),
    validateDueDateNotPast,
    body('assignedTo')
      .optional({ checkFalsy: true })
      .isUUID()
      .withMessage('Invalid user ID for assignment.'),
  ],
  validate,
  createTask
);

// GET /api/projects/:projectId/tasks
router.get('/project/:projectId', auth, getProjectTasks);

module.exports = router;
