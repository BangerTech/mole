import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService from '../services/AuthService'; // Adjust path as needed
import { CircularProgress, Box } from '@mui/material'; // Add loading indicator

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Assume AuthService.isLoggedIn() is synchronous or adjust if it's async
        const isLoggedIn = AuthService.isLoggedIn(); 
        setIsAuthenticated(isLoggedIn);
        if (!isLoggedIn) {
          navigate('/login');
        }
      } catch (error) {
        console.error("Authentication check failed:", error);
        setIsAuthenticated(false);
        navigate('/login'); 
      } finally {
          setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    // Display a loading indicator while checking auth
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? children : null; // Render children only if authenticated
};

export default ProtectedRoute; 