const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateLogin, handleValidationErrors } = require('../middleware/validation');

router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;