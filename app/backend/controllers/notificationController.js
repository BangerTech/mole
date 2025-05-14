const { getDbConnection } = require('../models/database');

// Dummy notifications - Replace with DB interaction later
let DUMMY_NOTIFICATIONS = [
  { id: 1, user_id: 1, type: 'system_update', title: 'System Update Available', message: 'A new version of Mole DB Agent is ready.', link: '/settings?tab=updates', read_status: 0, created_at: new Date(Date.now() - 3600000).toISOString(), preferences_key: 'systemUpdates' },
  { id: 2, user_id: 1, type: 'new_feature', title: 'New Feature: AI Assistant', message: 'Explore the new AI Assistant in the SQL Editor!', link: '/sql-editor?tab=ai', read_status: 0, created_at: new Date(Date.now() - 7200000).toISOString(), preferences_key: 'systemUpdates' },
  { id: 3, user_id: 2, type: 'db_connection_issue', title: 'DB Connection Alert: PG-Local', message: 'Could not connect to PostgreSQL Local.', link: '/databases/1', read_status: 0, created_at: new Date(Date.now() - 10800000).toISOString(), preferences_key: 'dbConnectionIssues' },
  { id: 4, user_id: 1, type: 'sync_complete', title: 'Sync Job \'Alpha\' Completed', message: 'Synchronization task \'Alpha\' finished successfully.', link: '/databases/sync/1', read_status: 1, created_at: new Date(Date.now() - 86400000).toISOString(), preferences_key: 'syncCompleted' },
];

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  const userId = req.userId; // Assuming authMiddleware sets this
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // --- Replace with actual DB logic --- 
  // For now, filter dummy notifications by user_id
  // In a real implementation, also consider user preferences from UserSettings
  const userNotifications = DUMMY_NOTIFICATIONS.filter(n => n.user_id === userId);
  // Sort by creation date, newest first
  userNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  // --- End of DB logic replacement ---

  res.json({
    success: true,
    notifications: userNotifications
  });
};

// POST /api/notifications/:notificationId/read
exports.markNotificationAsRead = async (req, res) => {
  const userId = req.userId;
  const notificationId = parseInt(req.params.notificationId, 10);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  if (isNaN(notificationId)) {
    return res.status(400).json({ success: false, message: 'Invalid notification ID' });
  }

  // --- Replace with actual DB logic --- 
  const notificationIndex = DUMMY_NOTIFICATIONS.findIndex(n => n.id === notificationId && n.user_id === userId);
  if (notificationIndex !== -1) {
    DUMMY_NOTIFICATIONS[notificationIndex].read_status = 1;
    console.log(`Notification ${notificationId} for user ${userId} marked as read (dummy).`);
    res.json({ success: true, notification: DUMMY_NOTIFICATIONS[notificationIndex] });
  } else {
    res.status(404).json({ success: false, message: 'Notification not found or not owned by user' });
  }
  // --- End of DB logic replacement ---
};

// POST /api/notifications/mark-all-as-read
exports.markAllNotificationsAsRead = async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // --- Replace with actual DB logic --- 
  let updatedCount = 0;
  DUMMY_NOTIFICATIONS.forEach(n => {
    if (n.user_id === userId && n.read_status === 0) {
      n.read_status = 1;
      updatedCount++;
    }
  });
  console.log(`Marked all ${updatedCount} unread notifications as read for user ${userId} (dummy).`);
  // --- End of DB logic replacement ---

  res.json({ success: true, message: 'All notifications marked as read', updatedCount });
};

// Future: Method to create a notification (e.g., called internally by other services)
// exports.createNotification = async (userId, type, title, message, link = null, preferencesKey) => { ... } 