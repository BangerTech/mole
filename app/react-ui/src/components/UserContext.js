import React, { createContext, useState, useEffect, useCallback } from 'react';
import NotificationService from '../services/NotificationService'; // Import NotificationService

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const calculateUnreadCount = (notifs) => {
    return notifs.filter(n => !n.read).length;
  };

  const fetchNotifications = useCallback(async () => {
    if (!user) return; // Only fetch if user is logged in
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

  useEffect(() => {
    const storedUser = localStorage.getItem('moleUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('[UserContext] User loaded from localStorage ON APP LOAD:', parsedUser);
        // Ensure consistency: use profile_image and remove profileImage if it exists
        let userToSet = { ...parsedUser };
        if (userToSet.hasOwnProperty('profileImage') && userToSet.profile_image === undefined) {
          userToSet.profile_image = userToSet.profileImage;
        }
        delete userToSet.profileImage; // Always remove the camelCase version

        setUser(userToSet);
      } catch (error) {
        console.error('Failed to parse stored user data from localStorage:', error);
        localStorage.removeItem('moleUser');
      }
    }
    setLoading(false);
  }, []);

  // Fetch notifications when user object changes (e.g., after login or loading from localStorage)
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
      profile_image: userData.profile_image || userData.profileImage || null, // Prioritize profile_image, fallback to profileImage for old data
      preferences: userData.preferences || {
        darkMode: true,
        notifications: true, // This refers to user settings, not actual notifications array
        showSampleDatabases: true,
        aiProvider: 'sqlpal'
      }
    };
    console.log('[UserContext] Data being stored (userToStore):', userToStore);
    setUser(userToStore);
    localStorage.setItem('moleUser', JSON.stringify(userToStore));
    // fetchNotifications(); // Called by useEffect dependent on `user` now
    return true;
  };

  const logout = () => {
    console.log('[UserContext] Logging out user.');
    setUser(null);
    setNotifications([]); // Clear notifications on logout
    setUnreadNotificationsCount(0);
    localStorage.removeItem('moleUser');
    localStorage.removeItem('mole_auth_token');
  };

  const updateUser = (newUserData) => {
    const currentUserState = user || {}; 
    let processedNewData = { ...newUserData };

    // Ensure consistency for profile_image
    if (processedNewData.hasOwnProperty('profileImage') && processedNewData.profile_image === undefined) {
      processedNewData.profile_image = processedNewData.profileImage;
    }
    delete processedNewData.profileImage; // Always remove the camelCase version if present in newUserData

    const updatedUser = {
      ...currentUserState, 
      ...processedNewData, 
      id: processedNewData.id || currentUserState.id,
      email: processedNewData.email || currentUserState.email,
      name: processedNewData.name || currentUserState.name,
      role: processedNewData.role || currentUserState.role,
      username: (processedNewData.username || processedNewData.email?.split('@')[0]) || currentUserState.username || '',
      fullName: processedNewData.name || currentUserState.name || '' 
    };
    // Ensure final object only has profile_image
    if (updatedUser.hasOwnProperty('profileImage')) {
        delete updatedUser.profileImage;
    }

    console.log('[UserContext] Updating user. Current state:', user, 'New data:', newUserData, 'Resulting updatedUser:', updatedUser);
    setUser(updatedUser);
    localStorage.setItem('moleUser', JSON.stringify(updatedUser));
  };

  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      await NotificationService.markAsRead(notificationId);
      // Refresh notifications from backend to ensure consistency
      fetchNotifications(); 
    } catch (error) {
      console.error(`[UserContext] Failed to mark notification ${notificationId} as read:`, error);
      // Optionally, show an error to the user via a snackbar or similar
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      // Refresh notifications from backend
      fetchNotifications(); 
    } catch (error) {
      console.error('[UserContext] Failed to mark all notifications as read:', error);
      // Optionally, show an error to the user
    }
  };

  return (
    <UserContext.Provider value={{
      user, 
      loading, 
      login, 
      logout, 
      updateUser, 
      notifications, 
      unreadNotificationsCount, 
      notificationsLoading, 
      fetchNotifications, // Expose for manual refresh if needed
      handleMarkNotificationAsRead,
      handleMarkAllNotificationsAsRead
    }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider }; 