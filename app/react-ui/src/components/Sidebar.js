import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Box, Link, Drawer, Typography } from '@mui/material';
import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import SettingsIcon from '@mui/icons-material/Settings';

const DRAWER_WIDTH = 280;

const RootStyle = styled('div')(({ theme }) => ({
  [theme.breakpoints.up('lg')]: {
    flexShrink: 0,
    width: DRAWER_WIDTH,
  },
}));

const LogoStyle = styled('img')({
  width: 70,
  height: 70,
  objectFit: 'contain'
});

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  padding: theme.spacing(3, 0),
  marginBottom: theme.spacing(2)
}));

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
  {
    title: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />
  }
];

export default function Sidebar({ open }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const renderContent = (
    <Box sx={{ px: 2.5, py: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <LogoContainer>
        <Link component="div" onClick={() => navigate('/')} sx={{ display: 'flex' }}>
          <LogoStyle src="/images/logo.png" alt="Mole Logo" />
        </Link>
      </LogoContainer>

      <List disablePadding sx={{ flexGrow: 1 }}>
        {navConfig.map((item) => (
          <ListItem
            button
            key={item.title}
            onClick={() => navigate(item.path)}
            selected={pathname === item.path}
            sx={{
              py: 1.5,
              px: 3,
              borderRadius: 1,
              mb: 0.5,
              ...(pathname === item.path && {
                color: 'primary.main',
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(33, 150, 243, 0.15)' 
                  : 'primary.lighter',
                fontWeight: 'fontWeightMedium',
              }),
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.title} />
          </ListItem>
        ))}
      </List>

      <Box sx={{ flexGrow: 0 }}>
        <Typography
          variant="body2"
          sx={{
            mt: 2,
            mx: 2,
            py: 1,
            color: 'text.secondary',
            textAlign: 'center',
          }}
        >
          Mole Database Manager v1.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <RootStyle>
      <Drawer
        open={!open}
        variant="persistent"
        PaperProps={{
          sx: {
            width: DRAWER_WIDTH,
            bgcolor: 'background.default',
            borderRightStyle: 'dashed',
            borderRightColor: (theme) => 
              theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)',
          },
        }}
        sx={{
          display: { xs: 'block', lg: 'none' },
        }}
      >
        {renderContent}
      </Drawer>

      <Drawer
        open={open}
        variant="persistent"
        PaperProps={{
          sx: {
            width: DRAWER_WIDTH,
            bgcolor: 'background.default',
            borderRightStyle: 'dashed',
            borderRightColor: (theme) => 
              theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.1)' 
                : 'rgba(0, 0, 0, 0.1)',
          },
        }}
        sx={{
          display: { xs: 'none', lg: 'block' },
        }}
      >
        {renderContent}
      </Drawer>
    </RootStyle>
  );
} 