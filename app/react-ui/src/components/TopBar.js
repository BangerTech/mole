import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  InputBase,
  alpha,
  Tooltip,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Close as CloseIcon,
  Brightness4 as Brightness4Icon,
  Logout as LogoutIcon,
  NotificationsActive as NotificationsActiveIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useThemeMode } from '../App';
import AuthService from '../services/AuthService';
import UserContext from './UserContext';

// Mock notifications data - in real app, this would come from a backend service
const initialNotifications = [
  { id: 1, text: 'Database synchronization completed', time: '5 minutes ago', read: false },
  { id: 2, text: 'New table created in production_db', time: '2 hours ago', read: false },
  { id: 3, text: 'System report available', time: 'Yesterday', read: false }
];

const TopBar = ({ toggleSidebar }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggleThemeMode } = useThemeMode();
  const { logout: contextLogout } = useContext(UserContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  const open = Boolean(anchorEl);
  const notificationsOpen = Boolean(notificationsAnchor);
  
  // Get unread notifications count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Profile menu handlers
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Notifications menu handlers
  const handleNotificationsClick = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

  // Mark individual notification as read
  const handleNotificationRead = (id) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    handleNotificationsClose();
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    // Mark all notifications as read
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
    
    // Close the notifications menu
    handleNotificationsClose();
    
    // Show snackbar confirmation
    setSnackbar({
      open: true,
      message: 'All notifications marked as read',
      severity: 'success'
    });
    
    // In a real app, you would also send this to the backend
  };

  // Settings drawer handlers
  const openSettingsDrawer = () => {
    setSettingsDrawerOpen(true);
  };

  const closeSettingsDrawer = () => {
    setSettingsDrawerOpen(false);
  };
  
  // Navigate to settings page
  const goToSettings = () => {
    navigate('/settings');
    closeSettingsDrawer();
  };

  // Handle user logout
  const handleLogout = () => {
    // Log out from AuthService
    AuthService.logout();
    
    // If using UserContext, also log out from there
    if (contextLogout) {
      contextLogout();
    }
    
    // Close the menu
    handleClose();
    
    // Navigate to login page
    navigate('/login');
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // For demo purposes, reset notifications after a certain time
  useEffect(() => {
    const timer = setTimeout(() => {
      // If all notifications are read, reset them for demo purposes
      if (notifications.every(n => n.read)) {
        setNotifications(initialNotifications);
      }
    }, 30000); // Reset after 30 seconds
    
    return () => clearTimeout(timer);
  }, [notifications]);

  return (
    <AppBar 
      position="static" 
      color="transparent" 
      elevation={0}
      sx={{
        backdropFilter: 'blur(20px)',
        backgroundColor: alpha(theme.palette.background.default, 0.9),
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        mb: 3
      }}
    >
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          sx={{ mr: 2 }}
          onClick={toggleSidebar}
        >
          <MenuIcon />
        </IconButton>
        
        <Box sx={{ 
          backgroundColor: alpha(theme.palette.background.paper, 0.3),
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          px: 2,
          width: 300 
        }}>
          <SearchIcon sx={{ color: theme.palette.text.secondary, mr: 1 }} />
          <InputBase
            placeholder="Search..."
            sx={{
              color: theme.palette.text.primary,
              width: '100%',
              '& .MuiInputBase-input': {
                py: 1
              }
            }}
          />
        </Box>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex' }}>
          <Tooltip title="Toggle theme">
            <IconButton 
              color="inherit"
              onClick={toggleThemeMode}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Notifications">
            <IconButton 
              color="inherit"
              onClick={handleNotificationsClick}
              aria-controls={notificationsOpen ? 'notifications-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={notificationsOpen ? 'true' : undefined}
            >
              <Badge badgeContent={unreadCount} color="secondary">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Menu
            id="notifications-menu"
            anchorEl={notificationsAnchor}
            open={notificationsOpen}
            onClose={handleNotificationsClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: {
                width: 320,
                maxHeight: 400,
                overflowY: 'auto',
                mt: 1.5
              }
            }}
          >
            <Typography variant="subtitle1" sx={{ px: 2, py: 1, fontWeight: 600 }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </Typography>
            <Divider />
            {notifications.filter(n => !n.read).length > 0 ? (
              notifications.filter(n => !n.read).map((notification) => (
                <MenuItem key={notification.id} onClick={() => handleNotificationRead(notification.id)} sx={{ py: 1.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {notification.text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.time}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            ) : (
              <Box sx={{ py: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  No new notifications
                </Typography>
              </Box>
            )}
            <Divider />
            {unreadCount > 0 && (
              <MenuItem onClick={handleMarkAllAsRead} sx={{ justifyContent: 'center' }}>
                <ListItemIcon>
                  <CheckCircleIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2" color="primary">
                  Mark all as read
                </Typography>
              </MenuItem>
            )}
          </Menu>
          
          <Tooltip title="Profile">
            <IconButton
              color="inherit"
              onClick={handleClick}
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <PersonIcon />
            </IconButton>
          </Tooltip>
          
          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: { 
                width: 200,
                mt: 1.5
              }
            }}
          >
            <MenuItem onClick={() => { handleClose(); navigate('/profile'); }}>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={() => { handleClose(); navigate('/settings'); }}>
              <ListItemIcon>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              Settings
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sign Out
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>

      {/* Settings Drawer */}
      <Drawer
        anchor="right"
        open={settingsDrawerOpen}
        onClose={closeSettingsDrawer}
        PaperProps={{
          sx: {
            width: 300,
            p: 2,
            backgroundColor: theme.palette.background.paper,
          }
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>Settings</Typography>
          <IconButton onClick={closeSettingsDrawer}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <List>
          <ListItem button onClick={toggleThemeMode}>
            <ListItemIcon>
              <Brightness4Icon />
            </ListItemIcon>
            <ListItemText primary="Appearance" secondary={mode === 'dark' ? 'Dark' : 'Light'} />
          </ListItem>
          <ListItem button onClick={goToSettings}>
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="All Settings" />
          </ListItem>
        </List>
      </Drawer>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppBar>
  );
};

export default TopBar; 