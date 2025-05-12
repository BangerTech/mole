import React, { createContext, useState, useEffect } from 'react';

const UserContext = createContext();

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('moleUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('[UserContext] User loaded from localStorage ON APP LOAD:', parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user data from localStorage:', error);
        localStorage.removeItem('moleUser');
      }
    }
    setLoading(false);
  }, []);

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
      // Explizit profileImage und preferences übernehmen oder initialisieren, falls sie fehlen
      profileImage: userData.profileImage || null,
      preferences: userData.preferences || {
        darkMode: true,
        notifications: true,
        showSampleDatabases: true,
        aiProvider: 'sqlpal' // Standard-AI-Provider, falls nicht vorhanden
      }
    };
    console.log('[UserContext] Data being stored (userToStore):', userToStore);
    setUser(userToStore);
    localStorage.setItem('moleUser', JSON.stringify(userToStore));
    console.log('[UserContext] moleUser in localStorage AFTER login call:', localStorage.getItem('moleUser'));
    return true;
  };

  const logout = () => {
    console.log('[UserContext] Logging out user.');
    setUser(null);
    localStorage.removeItem('moleUser');
    localStorage.removeItem('mole_auth_token'); // Auch Auth-Token entfernen
  };

  const updateUser = (newUserData) => {
    // Bestehenden User-State nehmen und mit neuen Daten mergen
    // Sicherstellen, dass alle Felder von userToStore erhalten bleiben, falls nicht in newUserData vorhanden
    const currentUserState = user || {}; 
    const updatedUser = {
      ...currentUserState, // Alle bestehenden Felder des aktuellen Users (aus dem State)
      ...newUserData, // Alle Felder aus den neuen Daten (überschreiben ggf. bestehende)
      // Sicherstellen, dass Kernfelder nicht versehentlich gelöscht werden, wenn sie in newUserData fehlen
      id: newUserData.id || currentUserState.id,
      email: newUserData.email || currentUserState.email,
      name: newUserData.name || currentUserState.name,
      role: newUserData.role || currentUserState.role,
      // Username und fullName ggf. neu ableiten, falls sich name oder email geändert haben
      username: (newUserData.username || newUserData.email?.split('@')[0]) || currentUserState.username || '',
      fullName: newUserData.name || currentUserState.name || '' 
    };
    console.log('[UserContext] Updating user. Current state:', user, 'New data:', newUserData, 'Resulting updatedUser:', updatedUser);
    setUser(updatedUser);
    localStorage.setItem('moleUser', JSON.stringify(updatedUser));
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider }; 