import React, { createContext, useState, useEffect, useCallback } from 'react';
import NotificationService from '../services/NotificationService'; // Import NotificationService
import UserSettingsService from '../services/UserSettingsService'; // Import UserSettingsService

const UserContext = createContext();

// Define default preferences structure for robust initialization
const defaultUserPreferences = {
  darkMode: true,
  notifications: {
    inApp: true,
    email: false,
    events: {
      dbConnectionIssues: true,
      syncCompleted: true,
      newDbConnections: true,
      systemUpdates: true,
    },
  },
  showSampleDatabases: true,
  ai: { // Default AI structure from Settings.js initialization
    defaultProvider: 'sqlpal',
    provider: 'sqlpal',
    providers: {
      openai: { apiKey: '', model: 'gpt-3.5-turbo' },
      perplexity: { apiKey: '', model: 'sonar-pro' },
      huggingface: { apiKey: '', model: 'mistralai/Mistral-7B-Instruct-v0.2' },
      llama: { modelPath: '/models/llama-2-7b' },
      sqlpal: { modelPath: '/app/models/sqlpal' },
    },
  },
  smtp: { // Default SMTP structure from Settings.js initialization
    host: '',
    port: '587',
    username: '',
    password: '',
    encryption: 'tls',
    fromEmail: '',
    fromName: 'Mole Database Manager'
  },
  security: { // Default security structure (example)
    autoLogout: false,
    logoutTimeout: 30 
  }
};

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const calculateUnreadCount = (notifs) => {
    return notifs.filter(n => !n.read).length; // 'read' is already a boolean from controller
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return; 
    setNotificationsLoading(true);
    try {
      const fetchedNotifications = await NotificationService.getNotifications();
      setNotifications(fetchedNotifications);
      setUnreadNotificationsCount(calculateUnreadCount(fetchedNotifications));
    } catch (error) {
      console.error('[UserContext] Failed to fetch notifications:', error);
      setNotifications([]);
      setUnreadNotificationsCount(0);
    } finally {
      setNotificationsLoading(false);
    } 
  }, [user]);

  // Robustly merge preferences with defaults
  const mergePreferences = (existingPrefs) => {
    const merged = { ...defaultUserPreferences, ...existingPrefs };
    merged.notifications = { 
      ...defaultUserPreferences.notifications, 
      ...(existingPrefs?.notifications || {}),
      events: {
        ...defaultUserPreferences.notifications.events,
        ...(existingPrefs?.notifications?.events || {}),
      }
    };
    merged.ai = { 
      ...defaultUserPreferences.ai, 
      ...(existingPrefs?.ai || {}),
      providers: {
        ...defaultUserPreferences.ai.providers,
        ...(existingPrefs?.ai?.providers || {}),
      }
    };
    merged.smtp = { ...defaultUserPreferences.smtp, ...(existingPrefs?.smtp || {}) };
    merged.security = { ...defaultUserPreferences.security, ...(existingPrefs?.security || {}) };
    return merged;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('moleUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('[UserContext] User loaded from localStorage ON APP LOAD:', parsedUser);
        
        let userToSet = { ...parsedUser };
        if (userToSet.hasOwnProperty('profileImage') && userToSet.profile_image === undefined) {
          userToSet.profile_image = userToSet.profileImage;
        }
        delete userToSet.profileImage; 

        // Ensure preferences are robustly initialized
        userToSet.preferences = mergePreferences(userToSet.preferences);

        setUser(userToSet);
      } catch (error) {
        console.error('Failed to parse stored user data from localStorage:', error);
        localStorage.removeItem('moleUser');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const login = (userData) => {
    console.log('[UserContext] Data received by login function (userData):', userData);
    const userToStore = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      username: userData.username || userData.email?.split('@')[0] || '',
      fullName: userData.name || '',
      createdAt: userData.createdAt || new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      profile_image: userData.profile_image || userData.profileImage || null, 
      preferences: mergePreferences(userData.preferences) // Merge with defaults on login
    };
    
    delete userToStore.profileImage; // Ensure only profile_image is present

    console.log('[UserContext] Data being stored (userToStore):', userToStore);
    setUser(userToStore);
    localStorage.setItem('moleUser', JSON.stringify(userToStore));
    return true;
  };

  const logout = () => {
    console.log('[UserContext] Logging out user.');
    setUser(null);
    setNotifications([]); 
    setUnreadNotificationsCount(0);
    localStorage.removeItem('moleUser');
    localStorage.removeItem('mole_auth_token');
  };

  // Generic function to update a part of user preferences
  const updateUserPreferences = async (preferenceUpdates) => {
    if (!user) {
      throw new Error("User not logged in. Cannot update preferences.");
    }

    const currentPreferences = user.preferences || {};
    // Deep merge the updates into current preferences
    // For simplicity, this example does a shallow merge at the top level of `preferenceUpdates`
    // A more robust solution might use a deep merge utility for nested objects like `notifications.events`
    // However, we will construct the full payload for the service, so direct merge is fine for `user` state.
    
    const newPreferences = {
      ...currentPreferences,
      ...preferenceUpdates, // This applies the chunk (e.g., { notifications: newNotificationSettings })
       // If preferenceUpdates contains nested objects like 'notifications', ensure they are fully formed
      notifications: preferenceUpdates.notifications ? 
        { ...defaultUserPreferences.notifications, ...currentPreferences.notifications, ...preferenceUpdates.notifications, events: {...defaultUserPreferences.notifications.events, ...currentPreferences.notifications?.events, ...preferenceUpdates.notifications?.events} } 
        : currentPreferences.notifications,
      ai: preferenceUpdates.ai ? 
        { ...defaultUserPreferences.ai, ...currentPreferences.ai, ...preferenceUpdates.ai, providers: {...defaultUserPreferences.ai.providers, ...currentPreferences.ai?.providers, ...preferenceUpdates.ai?.providers} } 
        : currentPreferences.ai,
      smtp: preferenceUpdates.smtp ? { ...defaultUserPreferences.smtp, ...currentPreferences.smtp, ...preferenceUpdates.smtp } : currentPreferences.smtp,
      security: preferenceUpdates.security ? { ...defaultUserPreferences.security, ...currentPreferences.security, ...preferenceUpdates.security } : currentPreferences.security,
    };

    // Prepare the full payload for UserSettingsService.saveSettings
    // This service expects an object containing all settings categories.
    const fullUserSettingsPayload = {
      notifications: newPreferences.notifications,
      ai: newPreferences.ai,
      smtp: newPreferences.smtp,
      security: newPreferences.security,
      darkMode: newPreferences.darkMode, // Persist other top-level settings
      showSampleDatabases: newPreferences.showSampleDatabases
    };

    try {
      await UserSettingsService.saveSettings(fullUserSettingsPayload);
      
      const updatedUser = {
        ...user,
        preferences: newPreferences,
      };
      
      setUser(updatedUser);
      localStorage.setItem('moleUser', JSON.stringify(updatedUser));
      console.log('[UserContext] User preferences updated and saved:', updatedUser);
      return { success: true, message: "Preferences updated successfully." };
    } catch (error) {
      console.error('[UserContext] Failed to save user preferences to backend:', error);
      throw error.response?.data || { message: 'Failed to save preferences to backend.' };
    }
  };

  // Specific function to update general user data (like name, email, avatar) - distinct from preferences
  const updateUser = (newUserData) => {
    const currentUserState = user || {}; 
    let processedNewData = { ...newUserData };

    if (processedNewData.hasOwnProperty('profileImage') && processedNewData.profile_image === undefined) {
      processedNewData.profile_image = processedNewData.profileImage;
    }
    delete processedNewData.profileImage; 

    const updatedUser = {
      ...currentUserState, 
      ...processedNewData, 
      id: processedNewData.id || currentUserState.id,
      email: processedNewData.email || currentUserState.email,
      name: processedNewData.name || currentUserState.name,
      role: processedNewData.role || currentUserState.role,
      username: (processedNewData.username || processedNewData.email?.split('@')[0]) || currentUserState.username || '',
      fullName: processedNewData.name || currentUserState.name || '',
      // Ensure preferences are carried over and not overwritten by a partial newUserData object
      preferences: processedNewData.preferences ? mergePreferences(processedNewData.preferences) : currentUserState.preferences
    };
    
    if (updatedUser.hasOwnProperty('profileImage')) {
        delete updatedUser.profileImage;
    }

    console.log('[UserContext] Updating user. Current state:', user, 'New data:', newUserData, 'Resulting updatedUser:', updatedUser);
    setUser(updatedUser);
    localStorage.setItem('moleUser', JSON.stringify(updatedUser));
    // Note: If updateUser is also intended to save to backend (e.g. name change), 
    // that would be a separate API call (e.g., to a user profile endpoint, not UserSettingsService for preferences)
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await NotificationService.markAsRead(notificationId);
      fetchNotifications(); 
    } catch (error) {
      console.error(`[UserContext] Failed to mark notification ${notificationId} as read:`, error);
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      fetchNotifications(); 
    } catch (error) {
      console.error('[UserContext] Failed to mark all notifications as read:', error);
    }
  };

  return (
    <UserContext.Provider value={{
      user, 
      loading, 
      login, 
      logout, 
      updateUser, 
      updateUserPreferences, // Expose the new function
      notifications, 
      unreadNotificationsCount, 
      notificationsLoading, 
      fetchNotifications, 
      handleMarkNotificationAsRead,
      handleMarkAllNotificationsAsRead
    }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider }; 