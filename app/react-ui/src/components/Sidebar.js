import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import MuiDrawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import SettingsIcon from '@mui/icons-material/Settings';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PersonIcon from '@mui/icons-material/Person';
import Tooltip from '@mui/material/Tooltip';
import { UserContext } from '../components/UserContext';

const drawerWidth = 240;

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  minHeight: 64,
  [theme.breakpoints.up('lg')]: {
    minHeight: 92,
  },
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  ...(open ? openedMixin(theme) : closedMixin(theme)),
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  
    '& .MuiDrawer-paper': {
    ...(open ? openedMixin(theme) : closedMixin(theme)),
    position: 'relative',
        borderRight: 'none',
    margin: theme.spacing(2, 0, 2, 2),
    height: `calc(100vh - ${theme.spacing(4)})`,
    borderRadius: theme.shape.borderRadius * 1.5,
    boxShadow: theme.shadows[8],
        backgroundColor: theme.palette.background.paper,
  },
}));

// --- Navigation Items --- 
const navConfig = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />
  },
  {
    title: 'Databases',
    path: '/databases',
    icon: <StorageIcon />
  },
  {
    title: 'SQL Editor',
    path: '/query',
    icon: <CodeIcon />
  },
  // Add more items here if needed, e.g.:
  // {
  //   title: 'Monitoring',
  //   path: '/monitoring',
  //   icon: <DnsIcon /> 
  // },
];

const adminConfig = [
  {
    title: 'User Management',
    path: '/users',
    icon: <SupervisorAccountIcon />
  }
];

const settingsConfig = [
  {
    title: 'Profile',
    path: '/profile',
    icon: <PersonIcon />
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />
  }
];

// Receive props from DashboardLayout
export default function Sidebar({ open, handleDrawerOpen, handleDrawerClose }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useContext(UserContext);

  const renderNavItems = (items) => (
    items.map((item) => (
        <Tooltip title={!open ? item.title : ''} placement="right" key={item.title}>
            <ListItemButton
                onClick={() => navigate(item.path)}
                selected={pathname.startsWith(item.path)}
                sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    mb: 0.5,
                    borderRadius: 1,
                    mx: 1.5,
                    ...(pathname.startsWith(item.path) && {
                        bgcolor: theme.palette.action.selected,
                        fontWeight: 'fontWeightBold',
                    }),
                    '&:hover': {
                        bgcolor: theme.palette.action.hover,
                    }
                }}
            >
                <ListItemIcon
                    sx={{
                        minWidth: 0,
                        mr: open ? 3 : 'auto',
                        justifyContent: 'center',
                        color: pathname.startsWith(item.path) ? theme.palette.primary.main : theme.palette.text.secondary, 
                    }}
                >
                    {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.title} sx={{ opacity: open ? 1 : 0, color: theme.palette.text.primary }} />
            </ListItemButton>
        </Tooltip>
    ))
  );

  return (
    <Drawer variant="permanent" open={open}>
      <DrawerHeader>
         {/* Display Logo when open */}
         <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', pl: open ? 1 : 0 }}>
            {open && (
                <Box 
                    component="img" 
                    src="/images/logo.png" 
                    alt="Mole Logo" 
                    sx={{ height: 60, width: 'auto', objectFit: 'contain' }} 
                />
            )}
         </Box>
        {/* Restore original onClick handler */}
        <IconButton 
          onClick={() => {
            console.log('Sidebar toggle button clicked. Current state:', open);
            if (open) {
              handleDrawerClose();
            } else {
              handleDrawerOpen();
            }
          }}
        >
          {open ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </DrawerHeader>

      <Divider />

      <List component="nav" sx={{ flexGrow: 1, pt: 2 }}>
        {renderNavItems(navConfig)}
        
        {/* Admin Menüpunkte nur anzeigen, wenn der User ein Admin ist */}
        {user?.role === 'admin' && (
          <>
            <Divider sx={{ my: 2 }} />
            {renderNavItems(adminConfig)}
          </>
        )}
      </List>
      
      <Divider />

      <List component="nav" sx={{ pt: 1 }}>
        {renderNavItems(settingsConfig)}
      </List>

       {/* Optional: Version Number */}
       <Box sx={{ flexGrow: 0, mb: 1 }}>
            {open && (
                <Typography
                    variant="caption"
                    sx={{ color: 'text.disabled', textAlign: 'center', display: 'block' }}
                >
                    Mole DB Agent v0.5.1
                </Typography>
            )}
        </Box>
    </Drawer>
  );
} 