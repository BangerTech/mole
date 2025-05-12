const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/user', authMiddleware, authController.getUser);

// Neue Route für die Überprüfung der Admin-Existenz (ungeschützt)
router.get('/check-admin-exists', authController.checkAdminExists);

module.exports = router; 