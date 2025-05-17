/**
 * AI Assistant Routes
 * Routes for AI assistant features and settings
 */

const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Get AI settings
router.get('/settings', aiController.getAISettings);

// Update AI settings
router.post('/settings', aiController.updateAISettings);

// Get available AI providers
router.get('/providers', aiController.getAIProviders);

// Test AI provider connection
router.post('/test', aiController.testAIProvider);

// Proxy for AI queries from frontend to Python backend
router.post('/query', aiController.queryAI);

module.exports = router; 