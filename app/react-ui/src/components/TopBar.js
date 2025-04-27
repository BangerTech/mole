import React, { useState } from 'react';
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
  Typography
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
  Brightness4 as Brightness4Icon
} from '@mui/icons-material';
import { useThemeMode } from '../App';

const TopBar = ({ toggleSidebar }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { mode, toggleThemeMode } = useThemeMode();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const open = Boolean(anchorEl);
  const notificationsOpen = Boolean(notificationsAnchor);

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

  const notifications = [
    { id: 1, text: 'Database synchronization completed', time: '5 minutes ago' },
    { id: 2, text: 'New table created in production_db', time: '2 hours ago' },
    { id: 3, text: 'System report available', time: 'Yesterday' }
  ];

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
              <Badge badgeContent={notifications.length} color="secondary">
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
              Notifications
            </Typography>
            <Divider />
            {notifications.map((notification) => (
              <MenuItem key={notification.id} onClick={handleNotificationsClose} sx={{ py: 1.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {notification.text}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {notification.time}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
            <Divider />
            <MenuItem onClick={handleNotificationsClose} sx={{ justifyContent: 'center' }}>
              <Typography variant="body2" color="primary">
                View all
              </Typography>
            </MenuItem>
          </Menu>
          
          <Tooltip title="Settings">
            <IconButton 
              color="inherit"
              onClick={openSettingsDrawer}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
          
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
            <MenuItem onClick={handleClose}>Profile</MenuItem>
            <MenuItem onClick={handleClose}>My Account</MenuItem>
            <Divider />
            <MenuItem onClick={handleClose}>Sign Out</MenuItem>
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
    </AppBar>
  );
};

export default TopBar; 