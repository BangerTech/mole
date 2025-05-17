const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

// SMTP routes
router.post('/smtp/save', emailController.saveSmtpSettings);
router.get('/smtp/get', emailController.getSmtpSettings);
router.post('/smtp/test', emailController.testSmtpConnection);

// Email sending routes
router.post('/send', emailController.sendEmail);
router.post('/send-test', emailController.sendTestEmail);

module.exports = router; 