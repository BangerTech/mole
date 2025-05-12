import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { alpha, styled } from '@mui/material/styles';
import { Box, Stack, AppBar, Toolbar, IconButton, Typography, Menu, MenuItem, Tooltip, Divider, ListItemIcon, List, ListItemText, Snackbar, Alert as MuiAlert, Avatar } from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import NotificationsIcon from '@mui/icons-material/Notifications';
import Badge from '@mui/material/Badge';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import { useThemeMode } from '../App';
import { UserContext } from './UserContext';
import AuthService from '../services/AuthService';

const closedDrawerWidth = (theme) => `calc(${theme.spacing(8)} + 1px)`;
const drawerWidth = 240;
const APPBAR_MOBILE = 64;
const APPBAR_DESKTOP = 92;

// Sidebar margins (assuming theme.spacing(2) = 16px)
const sidebarMarginLeft = 16;
const sidebarMarginTop = 16;

// Dummy initial notifications - replace with actual data fetching later
const initialNotifications = [
  { id: 1, title: 'New DB connection established', read: false, timestamp: '2 hours ago' },
  { id: 2, title: 'Sync complete', read: false, timestamp: '3 hours ago' },
  { id: 3, title: 'System update available', read: true, timestamp: '1 day ago' },
];

// ForwardRef for Alert
const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const RootStyle = styled(AppBar, { 
  shouldForwardProp: (prop) => prop !== 'open' 
})(({ theme }) => {
  return {
    position: 'fixed', 
    boxShadow: theme.shadows[8], 
    backgroundColor: theme.palette.background.paper, 
  zIndex: theme.zIndex.drawer + 1,
    borderRadius: theme.shape.borderRadius * 1.5, 
    marginTop: `${sidebarMarginTop}px`, 
    right: theme.spacing(2),
    width: 'auto',
  };
});

const ToolbarStyle = styled(Toolbar)(({ theme }) => ({
  minHeight: APPBAR_MOBILE,
  paddingLeft: theme.spacing(1.5),
  paddingRight: theme.spacing(1.5),
}));

export default function Navbar() {
  const { mode, toggleThemeMode } = useThemeMode();
  const { user, logout: contextLogout } = useContext(UserContext);
  const navigate = useNavigate();

  const [accountMenuAnchor, setAccountMenuAnchor] = useState(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState(null);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const accountMenuOpen = Boolean(accountMenuAnchor);
  const notificationMenuOpen = Boolean(notificationMenuAnchor);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleAccountMenuOpen = (event) => {
    setAccountMenuAnchor(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAccountMenuAnchor(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationMenuAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationMenuAnchor(null);
  };

  // --- Notification Handlers ---
  const handleNotificationRead = (id) => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    // In a real app, mark as read on the backend too
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prevNotifications => 
      prevNotifications.map(notification => ({ ...notification, read: true }))
    );
    handleNotificationMenuClose();
    setSnackbar({
      open: true,
      message: 'All notifications marked as read',
      severity: 'success'
    });
    // In a real app, mark all as read on the backend too
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar({ ...snackbar, open: false });
  };

  // --- Logout Handler ---
  const handleLogout = () => {
    handleAccountMenuClose();
    contextLogout(); // Call logout from context
    AuthService.logout(); // Entferne auch Token/User aus AuthService
    navigate('/login'); // Redirect to login
  };

  // --- Navigation Handlers ---
  const navigateToProfile = () => {
    handleAccountMenuClose();
    navigate('/profile');
  };

  const navigateToSettings = () => {
    handleAccountMenuClose();
    navigate('/settings');
  };

  return (
    <RootStyle>
      <ToolbarStyle>
        <Box sx={{ flexGrow: 1 }} />

        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 0.5, sm: 1.5 }}
        >
          <Tooltip title="Toggle light/dark theme">
            <IconButton sx={{ color: 'text.primary' }} onClick={toggleThemeMode}>
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Notifications">
            <IconButton 
              sx={{ color: 'text.primary' }}
              onClick={handleNotificationMenuOpen}
              aria-controls={notificationMenuOpen ? 'notifications-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={notificationMenuOpen ? 'true' : undefined}
            >
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Typography variant="subtitle1" color="text.primary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user?.name || 'Guest'}
          </Typography>
          
          <Tooltip title="Account settings">
            <IconButton
              edge="end"
              sx={{ color: 'text.primary' }}
              onClick={handleAccountMenuOpen}
              aria-controls={accountMenuOpen ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={accountMenuOpen ? 'true' : undefined}
            >
              {user?.avatarUrl ? <Avatar src={user.avatarUrl} sx={{ width: 32, height: 32 }} /> : <AccountCircle />}
            </IconButton>
          </Tooltip>
        </Stack>
      </ToolbarStyle>

      {/* Account Menu */}
      <Menu
        id="account-menu"
        anchorEl={accountMenuAnchor}
        open={accountMenuOpen}
        onClose={handleAccountMenuClose}
        PaperProps={{
          sx: (theme) => ({ 
             width: 200, 
             borderRadius: 2, 
             mt: 1.5,
             boxShadow: theme.shadows[10],
          }),
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={navigateToProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={navigateToSettings}>
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

      {/* Notifications Menu */}
      <Menu
        id="notifications-menu"
        anchorEl={notificationMenuAnchor}
        open={notificationMenuOpen}
        onClose={handleNotificationMenuClose}
        PaperProps={{
          sx: (theme) => ({ 
             width: 360,
             maxWidth: '90vw',
             borderRadius: 2, 
             mt: 1.5, 
             boxShadow: theme.shadows[10],
          }),
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: '12px 16px' }}>
          <Typography variant="h6" component="div">
            Notifications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadCount} New
          </Typography>
        </Box>
        <Divider sx={{ borderStyle: 'dashed' }} />

        <List sx={{ maxHeight: 340, overflow: 'auto', p: 0 }}>
          {notifications.length === 0 && (
              <Typography sx={{ p: 2, textAlign: 'center' }} color="text.secondary">No notifications</Typography>
          )}
          {notifications.map((notification) => (
            <MenuItem 
              key={notification.id} 
              onClick={() => handleNotificationRead(notification.id)}
              sx={(theme) => ({ 
                bgcolor: !notification.read ? alpha(theme.palette.primary.main, 0.08) : 'transparent', 
                py: 1.5, 
                px: 2 
              })}
            >
              <ListItemText
                primary={notification.title}
                secondary={notification.timestamp}
                primaryTypographyProps={{ variant: 'body2', fontWeight: notification.read ? 'normal' : 'medium' }}
                secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
              />
        </MenuItem>
          ))}
        </List>
        
        <Divider sx={{ borderStyle: 'dashed' }} />

        {unreadCount > 0 && (
            <MenuItem 
                onClick={handleMarkAllAsRead} 
                sx={{ justifyContent: 'center', py: 1, color: 'primary.main' }}
            >
                <ListItemIcon sx={{ minWidth: 'auto', mr: 0.5, color: 'primary.main' }}>
                  <CheckCircleIcon fontSize="small" />
                </ListItemIcon>
                <Typography variant="body2" fontWeight="medium">
                  Mark all as read
                </Typography>
        </MenuItem>
        )}
      </Menu>

       {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

    </RootStyle>
  );
} 