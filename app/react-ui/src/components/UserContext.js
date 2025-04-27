import React, { createContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in from localStorage
    const storedUser = localStorage.getItem('moleUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user data', error);
        localStorage.removeItem('moleUser');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    // Store user in state and localStorage
    setUser(userData);
    localStorage.setItem('moleUser', JSON.stringify(userData));
    return true;
  };

  const logout = () => {
    // Remove user from state and localStorage
    setUser(null);
    localStorage.removeItem('moleUser');
  };

  const updateUser = (userData) => {
    // Update user data in state and localStorage
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('moleUser', JSON.stringify(updatedUser));
  };

  return (
    <UserContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserContext; 