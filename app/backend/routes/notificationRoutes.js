const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Alle Benachrichtigungsrouten sind geschützt und erfordern Authentifizierung
router.use(authMiddleware);

// GET /api/notifications - Holt alle Benachrichtigungen für den eingeloggten Benutzer
router.get('/', notificationController.getNotifications);

// POST /api/notifications/:notificationId/read - Markiert eine spezifische Benachrichtigung als gelesen
router.post('/:notificationId/read', notificationController.markNotificationAsRead);

// POST /api/notifications/mark-all-as-read - Markiert alle Benachrichtigungen des Benutzers als gelesen
router.post('/mark-all-as-read', notificationController.markAllNotificationsAsRead);

module.exports = router; 