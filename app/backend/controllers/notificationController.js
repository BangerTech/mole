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
  const userId = req.userId; 
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const db = await getDbConnection();
    // Fetch notifications for the user, ordered by creation date descending
    // Ensure the field names match the user_notifications table schema (e.g., read_status)
    const userNotifications = await db.all(
      'SELECT id, user_id, type, title, message, link, read_status, created_at, preferences_key FROM user_notifications WHERE user_id = ? ORDER BY created_at DESC',
      userId
    );
    
    // Convert read_status (0 or 1) to boolean (false or true) for frontend consistency if needed,
    // or ensure frontend handles 0/1. For now, let's send as is.
    // The UserContext currently expects 'read' boolean. Let's transform it here.
    const transformedNotifications = userNotifications.map(n => ({
      ...n,
      read: !!n.read_status // Convert 0/1 to false/true
    }));

    res.json({
      success: true,
      notifications: transformedNotifications,
    });
  } catch (error) {
    console.error('[notificationController.getNotifications] Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
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

  try {
    const db = await getDbConnection();
    const result = await db.run(
      'UPDATE user_notifications SET read_status = 1 WHERE id = ? AND user_id = ?',
      notificationId,
      userId
    );

    if (result.changes > 0) {
      // Optionally, fetch the updated notification to return it
      const updatedNotification = await db.get(
        'SELECT id, user_id, type, title, message, link, read_status, created_at, preferences_key FROM user_notifications WHERE id = ?',
        notificationId
      );
      res.json({ success: true, notification: { ...updatedNotification, read: !!updatedNotification.read_status } });
    } else {
      res.status(404).json({ success: false, message: 'Notification not found or not owned by user' });
    }
  } catch (error) {
    console.error(`[notificationController.markNotificationAsRead] Error marking notification ${notificationId} as read:`, error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
};

// POST /api/notifications/mark-all-as-read
exports.markAllNotificationsAsRead = async (req, res) => {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const db = await getDbConnection();
    const result = await db.run(
      'UPDATE user_notifications SET read_status = 1 WHERE user_id = ? AND read_status = 0',
      userId
    );
    
    console.log(`[notificationController.markAllNotificationsAsRead] Marked ${result.changes} unread notifications as read for user ${userId}.`);
    res.json({ success: true, message: 'All notifications marked as read', updatedCount: result.changes });
  } catch (error) {
    console.error(`[notificationController.markAllNotificationsAsRead] Error marking all notifications as read for user ${userId}:`, error);
    res.status(500).json({ success: false, message: 'Failed to mark all notifications as read.' });
  }
};

// Future: Method to create a notification (e.g., called internally by other services)
exports.createNotification = async (userId, type, title, message, link = null, preferencesKey) => {
  console.log('[notificationController.createNotification] Received parameters:', { userId, type, title, message, link, preferencesKey });
  if (!userId || !type || !title || !preferencesKey) {
    console.error('[notificationController.createNotification] Missing required fields for creating notification.');
    throw new Error('Missing required fields for notification creation.');
  }

  let db;
  try {
    db = await getDbConnection();

    // 1. Fetch user preferences
    const user = await db.get('SELECT preferences FROM users WHERE id = ?', userId);
    if (!user) {
      console.error(`[notificationController.createNotification] User with ID ${userId} not found.`);
      // Decide if this should throw or just not create notification
      return { success: false, message: 'User not found.' }; 
    }

    let preferences = {};
    try {
      if (user.preferences) {
        preferences = JSON.parse(user.preferences);
      }
    } catch (parseError) {
      console.error(`[notificationController.createNotification] Failed to parse preferences for user ${userId}:`, parseError);
      // Use default or empty preferences if parsing fails
      preferences = { notifications: { inApp: true, events: {} } }; 
    }

    // Default to true if not specifically set (safe default)
    const generalInAppEnabled = preferences.notifications?.inApp !== undefined ? preferences.notifications.inApp : true;
    const eventSpecificEnabled = preferences.notifications?.events?.[preferencesKey] !== undefined ? preferences.notifications.events[preferencesKey] : true;

    if (!generalInAppEnabled || !eventSpecificEnabled) {
      console.log(`[notificationController.createNotification] Notification for user ${userId}, type ${preferencesKey}, skipped due to user preferences. InApp: ${generalInAppEnabled}, EventSpecific: ${eventSpecificEnabled}`);
      return { success: true, message: 'Notification skipped due to user preferences.', notification: null };
    }

    // 2. Insert notification if preferences allow
    const result = await db.run(
      'INSERT INTO user_notifications (user_id, type, title, message, link, preferences_key, read_status, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)',
      [userId, type, title, message, link, preferencesKey]
    );

    if (result.lastID) {
      const newNotification = await db.get(
        'SELECT id, user_id, type, title, message, link, read_status, created_at, preferences_key FROM user_notifications WHERE id = ?',
        result.lastID
      );
      console.log(`[notificationController.createNotification] Notification created successfully for user ${userId}, ID: ${result.lastID}`);
      // db.close() should be handled in a finally block if we are opening it here
      return { success: true, notification: { ...newNotification, read: !!newNotification.read_status } };
    } else {
      console.error('[notificationController.createNotification] Failed to insert notification into database.');
      throw new Error('Failed to create notification in database.');
    }
  } catch (error) {
    console.error(`[notificationController.createNotification] Error creating notification for user ${userId}:`, error);
    throw error; // Re-throw the error so the calling service can handle it if necessary
  } finally {
    if (db) {
      // Only close if we are sure this function is responsible for the full lifecycle of db connection
      // If getDbConnection provides a shared or pooled connection, closing might be handled elsewhere or differently.
      // For a simple sqlite setup where getDbConnection opens a new one each time, this is okay.
      // await db.close(); // Assuming getDbConnection opens a new connection that needs closing.
      // Given the structure of other controller functions, db.close() is usually not called here.
      // getDbConnection() typically returns a promise that resolves with an open db object.
      // The calling function or a higher-level middleware should manage closing.
      // For now, I will remove the db.close() here to align with other controller patterns.
    }
  }
}; 