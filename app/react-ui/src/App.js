import React, { useState, createContext, useMemo, useContext, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, Outlet } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Dashboard from './pages/Dashboard';
import DatabasesList from './pages/DatabasesList';
import DatabaseDetails from './pages/DatabaseDetails';
import DatabaseForm from './pages/DatabaseForm';
import DatabaseCreate from './pages/DatabaseCreate';
import TableView from './pages/TableView';
import QueryEditor from './pages/QueryEditor';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import UserManagement from './pages/UserManagement';
import Setup from './pages/Setup';
import { UserProvider, UserContext } from './components/UserContext';
import AuthService from './services/AuthService';
import DatabaseService from './services/DatabaseService';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import { CircularProgress } from '@mui/material';
import UserService from './services/UserService';

// Create a theme context
export const ThemeModeContext = createContext({
  toggleThemeMode: () => {},
  mode: 'dark',
});

// Custom hook to use the theme context
export const useThemeMode = () => useContext(ThemeModeContext);

function App() {
  const [mode, setMode] = useState('dark');

  // Theme mode context value
  const themeMode = useMemo(
    () => ({
      toggleThemeMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode]
  );

  // Generate the theme based on the current mode
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#2196f3', // Bright blue
            light: '#64b5f6',
            dark: '#1976d2',
            contrastText: '#ffffff',
          },
          secondary: {
            main: '#4caf50', // Green
            light: '#81c784',
            dark: '#388e3c',
            contrastText: '#ffffff',
          },
          background: {
            default: mode === 'dark' ? '#1a1a1a' : '#f5f7fa', // Background colors for both modes
            paper: mode === 'dark' ? '#2d2d2d' : '#ffffff',   // Card background for both modes
          },
          text: {
            primary: mode === 'dark' ? '#ffffff' : '#212B36',
            secondary: mode === 'dark' ? '#b0b0b0' : '#637381',
          },
          divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          action: {
            active: mode === 'dark' ? '#ffffff' : '#637381',
            hover: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
            selected: mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
            disabled: mode === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.26)',
            disabledBackground: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          }
        },
        typography: {
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          h1: {
            fontWeight: 600,
            fontSize: '2.5rem',
          },
          h2: {
            fontWeight: 600,
            fontSize: '2rem',
          },
          h3: {
            fontWeight: 600,
            fontSize: '1.75rem',
          },
          h4: {
            fontWeight: 500,
            fontSize: '1.5rem',
          },
          h5: {
            fontWeight: 500,
            fontSize: '1.25rem',
          },
          h6: {
            fontWeight: 500,
            fontSize: '1rem',
          },
          button: {
            textTransform: 'none',
            fontWeight: 500,
          },
        },
        shape: {
          borderRadius: 8,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                padding: '8px 16px',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                },
              },
              containedPrimary: {
                background: 'linear-gradient(45deg, #2196f3, #1976d2)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #64b5f6, #2196f3)',
                },
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'dark' 
                  ? '0 4px 8px rgba(0,0,0,0.2)' 
                  : '0 1px 3px rgba(0,0,0,0.1)',
                borderRadius: 12,
                backgroundColor: mode === 'dark' ? '#2d2d2d' : '#ffffff',
                border: mode === 'dark' 
                  ? '1px solid rgba(255, 255, 255, 0.05)' 
                  : '1px solid rgba(0, 0, 0, 0.05)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'dark' ? '#2d2d2d' : '#ffffff',
              },
              rounded: {
                borderRadius: 12,
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backgroundColor: mode === 'dark' ? '#1f1f1f' : '#ffffff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                color: mode === 'dark' ? '#ffffff' : '#637381',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: mode === 'dark' 
                  ? '1px solid rgba(255, 255, 255, 0.08)' 
                  : '1px solid rgba(0, 0, 0, 0.08)',
              },
              head: {
                fontWeight: 600,
                backgroundColor: mode === 'dark' ? '#252525' : '#f4f6f8',
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={themeMode}>
      <ThemeProvider theme={theme}>
        <UserProvider>
          <CssBaseline />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/setup" element={<Setup />} />

            {/* Root route - redirects to login if not authenticated, or setup if no admins */}
            <Route 
              path="/" 
              element={
                <InitialRouteHandler />
              }
            />
            
            {/* Protected routes */}
            <Route 
              element={
                <ProtectedRoute>
                  <DashboardLayout /> 
                </ProtectedRoute>
              }
            >
              {/* Child routes rendered via Outlet in DashboardLayout */}
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="databases" element={<DatabasesList />} />
              <Route path="databases/create" element={<DatabaseForm />} />
              <Route path="databases/new" element={<DatabaseCreate />} />
              <Route path="databases/edit/:id" element={<DatabaseForm />} />
              {/* Combined database details route */}
              <Route path="database/:type/:name" element={<DatabaseDetails />} /> 
              <Route path="database/id/:id" element={<DatabaseDetails />} /> 
              {/* Table view routes */}
              <Route path="database/:type/:name/table/:table" element={<TableView />} />
              <Route path="databases/:id/tables/:tableName" element={<TableView />} />
            
              <Route path="query" element={<QueryEditor />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
              
              {/* User Management Route - nur für Admins zugänglich */}
              <Route path="users" element={<UserManagement />} />
              
              {/* Add other nested routes here */}
            </Route>

            {/* Fallback route for unmatched paths */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </UserProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

// Komponente zur Behandlung der initialen Route
function InitialRouteHandler() {
  const [isAdminSetupComplete, setIsAdminSetupComplete] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(UserContext);

  useEffect(() => {
    const performAdminCheck = async () => {
      try {
        console.log('[InitialRouteHandler] Checking if admin setup is complete...');
        const response = await AuthService.checkAdminExists();
        console.log('[InitialRouteHandler] Response from checkAdminExists:', response);
        if (response && typeof response.adminExists === 'boolean') {
          setIsAdminSetupComplete(response.adminExists);
        } else {
          // Fallback, falls die Antwort nicht das erwartete Format hat
          console.error('[InitialRouteHandler] Invalid response from checkAdminExists, assuming setup needed.');
          setIsAdminSetupComplete(false);
        }
      } catch (error) {
        console.error('[InitialRouteHandler] Error calling checkAdminExists:', error);
        setIsAdminSetupComplete(false); // Im Fehlerfall Setup als notwendig ansehen
      }
      setLoading(false);
    };

    // Diese Prüfung nur einmal beim Laden der App durchführen, oder wenn sich der User-Status ändert,
    // um nach einem Logout ggf. wieder zum Setup zu leiten, falls der letzte Admin gelöscht wurde (hypothetisch).
    // Für den einfachen Fall reicht die Prüfung beim initialen Laden.
    if (isAdminSetupComplete === null) {
      performAdminCheck();
    } else {
      setLoading(false); // Wenn bereits geprüft, Loading beenden
    }

  }, [isAdminSetupComplete]);

  if (loading) {
    return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: '20%' }} />;
  }

  // Wenn kein Admin-Setup abgeschlossen ist (d.h. kein Admin-Account existiert), zur Setup-Seite weiterleiten
  if (!isAdminSetupComplete) {
    console.log('[InitialRouteHandler] Admin setup not complete, navigating to /setup.');
    return <Navigate to="/setup" replace />;
  }

  // Wenn Admin-Setup abgeschlossen ist, aber Benutzer nicht eingeloggt ist, zum Login weiterleiten
  if (!AuthService.isLoggedIn()) {
    console.log('[InitialRouteHandler] Admin setup complete, user not logged in, navigating to /login.');
    return <Navigate to="/login" replace />;
  }
  
  // Andernfalls zum Dashboard weiterleiten
  console.log('[InitialRouteHandler] Admin setup complete, user logged in, navigating to /dashboard.');
  return <Navigate to="/dashboard" replace />;
}

export default App; 