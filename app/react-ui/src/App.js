import React, { useState, createContext, useMemo, useContext, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { UserProvider } from './components/UserContext';
import AuthService from './services/AuthService';
import DatabaseService from './services/DatabaseService';
import './App.css';

// Create a theme context
export const ThemeModeContext = createContext({
  toggleThemeMode: () => {},
  mode: 'dark',
});

// Custom hook to use the theme context
export const useThemeMode = () => useContext(ThemeModeContext);

// Protected route component to check authentication
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      const isLoggedIn = AuthService.isLoggedIn();
      setIsAuthenticated(isLoggedIn);
      setLoading(false);
      
      if (!isLoggedIn) {
        navigate('/login');
      }
    };
    
    checkAuth();
  }, [navigate]);
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return isAuthenticated ? children : null;
};

// Layout component to wrap all protected routes
const DashboardLayout = ({ children, mode, sidebarOpen, toggleSidebar }) => {
  return (
    <div className={`app-container ${mode}`}>
      <Sidebar open={sidebarOpen} />
      <div className={`content ${!sidebarOpen ? 'content-full' : ''}`}>
        <TopBar toggleSidebar={toggleSidebar} />
        {children}
      </div>
    </div>
  );
};

function App() {
  const [mode, setMode] = useState('dark');
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <ThemeModeContext.Provider value={themeMode}>
      <ThemeProvider theme={theme}>
        <UserProvider>
          <CssBaseline />
          <Routes>
            {/* Authentication routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes with layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <Navigate to="/dashboard" replace />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/databases" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <DatabasesList />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/databases/create" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <DatabaseForm />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/databases/new" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <DatabaseCreate />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/databases/edit/:id" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <DatabaseForm />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/databases/:id" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <DatabaseDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/database/:type/:name" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <DatabaseDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/database/id/:dbName" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <DatabaseDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/database/:type/:name/tables" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <DatabasesList />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/database/:type/:name/table/:table" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <TableView />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/databases/:id/tables/:tableName" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <TableView /> 
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/query" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <QueryEditor />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <DashboardLayout 
                  mode={mode} 
                  sidebarOpen={sidebarOpen} 
                  toggleSidebar={toggleSidebar}
                >
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Redirect all other paths to login or dashboard based on auth state */}
            <Route path="*" element={
              AuthService.isLoggedIn() 
                ? <Navigate to="/dashboard" replace /> 
                : <Navigate to="/login" replace />
            } />
          </Routes>
        </UserProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export default App; 