import React, { useState, useEffect, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import { Link } from 'react-router-dom';
import { UserContext } from '../components/UserContext';

const drawerWidth = 240; // Consistent width
const closedDrawerWidth = (theme) => `calc(${theme.spacing(8)} + 1px)`; // Width when closed

const APP_BAR_MOBILE = 28;
const APP_BAR_DESKTOP = 37;
const NAVBAR_MARGIN_TOP = 0;

const EXTRA_PADDING_TOP = 0;

const RootStyle = styled('div')(({ theme }) => ({
  display: 'flex',
  minHeight: '100%',
  // gap: theme.spacing(2), // Gap wird durch die Positionierung von Sidebar und Main Content geregelt
}));

const MainStyle = styled('main', { 
  shouldForwardProp: (prop) => prop !== 'open' 
})(({ theme, open }) => ({
  flexGrow: 1,
  overflow: 'auto',
  height: '100vh', // Zurück zu height: 100vh
  paddingTop: APP_BAR_MOBILE + NAVBAR_MARGIN_TOP + EXTRA_PADDING_TOP,
  paddingBottom: theme.spacing(10),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  marginLeft: open ? `${240 + theme.spacing(2)}px` : `calc(${theme.spacing(7)} + 1px + ${theme.spacing(2)}px)`,
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  boxSizing: 'border-box',
  [theme.breakpoints.up('lg')]: {
    paddingTop: APP_BAR_DESKTOP + NAVBAR_MARGIN_TOP + EXTRA_PADDING_TOP, 
    marginLeft: open ? `${240 + theme.spacing(2)}px` : `calc(${theme.spacing(8)} + 1px + ${theme.spacing(2)}px)`, 
  },
  [theme.breakpoints.down('sm')]: {
    marginLeft: open ? `${240 + theme.spacing(1)}px` : `calc(${theme.spacing(7)} + 1px + ${theme.spacing(1)}px)`, 
    paddingLeft: theme.spacing(1),
    paddingRight: theme.spacing(1),
  }
}));

export default function DashboardLayout() {
  const theme = useTheme(); // Get theme for spacing
  const [open, setOpen] = useState(true); // Keep sidebar open by default
  const { user } = useContext(UserContext);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <RootStyle>
      <CssBaseline />
      <Sidebar open={open} handleDrawerOpen={handleDrawerOpen} handleDrawerClose={handleDrawerClose} />
      
      <MainStyle open={open}>
        <Outlet />
      </MainStyle>
      
      <Navbar />
    </RootStyle>
  );
}

// openedMixin und closedMixin (Beispiel, wie sie aussehen könnten)
const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
}); 