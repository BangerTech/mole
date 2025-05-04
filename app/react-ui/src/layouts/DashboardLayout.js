import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const drawerWidth = 240; // Consistent width
const closedDrawerWidth = (theme) => `calc(${theme.spacing(8)} + 1px)`; // Width when closed

const APP_BAR_MOBILE = 64;
const APP_BAR_DESKTOP = 92;
const NAVBAR_MARGIN_TOP = 16; // Corresponds to sidebarMarginTop in Navbar

const EXTRA_PADDING_TOP = 16; // Added for padding

const RootStyle = styled('div')(({ theme }) => ({
  display: 'flex',
  minHeight: '100%',
  gap: theme.spacing(2),
}));

// Apply dynamic margin based on sidebar state
const MainStyle = styled('main', { 
  shouldForwardProp: (prop) => prop !== 'open' 
})(({ theme, open }) => ({
  flexGrow: 1,
  overflow: 'auto',
  height: '100vh',
  paddingTop: APP_BAR_MOBILE + NAVBAR_MARGIN_TOP + EXTRA_PADDING_TOP,
  paddingBottom: theme.spacing(10),
  paddingRight: theme.spacing(2),
  boxSizing: 'border-box',
  [theme.breakpoints.up('lg')]: {
    paddingTop: APP_BAR_DESKTOP + NAVBAR_MARGIN_TOP + EXTRA_PADDING_TOP, 
  },
}));

export default function DashboardLayout() {
  const theme = useTheme(); // Get theme for spacing
  const [open, setOpen] = useState(true); // Keep sidebar open by default

  const handleDrawerOpen = () => {
    console.log('[DashboardLayout] handleDrawerOpen called'); // Log handler call
    setOpen(true);
    console.log('[DashboardLayout] setOpen(true) executed'); // Log state update attempt
  };

  const handleDrawerClose = () => {
    console.log('[DashboardLayout] handleDrawerClose called'); // Log handler call
    setOpen(false);
    console.log('[DashboardLayout] setOpen(false) executed'); // Log state update attempt
  };

  // Log the open state whenever it changes
  useEffect(() => {
    console.log('[DashboardLayout] open state changed:', open);
  }, [open]);

  return (
    <RootStyle>
      <CssBaseline />
      {/* Remove open prop from Navbar */}
      {/* <Navbar open={open} /> */}
      <Navbar /> 
      {/* Pass state and handlers to Sidebar */}
      <Sidebar 
        open={open} 
        handleDrawerOpen={handleDrawerOpen} 
        handleDrawerClose={handleDrawerClose} 
      />
      {/* Pass open state to MainStyle for margin adjustment */}
      <MainStyle open={open}>
        {/* Remove the Box wrapper if MainStyle already handles padding */}
        <Outlet /> 
      </MainStyle>
    </RootStyle>
  );
} 