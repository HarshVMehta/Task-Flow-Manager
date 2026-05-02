const express = require('express');
const { getStats } = require('../controllers/dashboardController');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', auth, getStats);

module.exports = router;
