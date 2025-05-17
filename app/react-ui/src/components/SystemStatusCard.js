import React from 'react';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    CircularProgress, 
    useTheme
} from '@mui/material';
import MemoryIcon from '@mui/icons-material/Memory';
import StorageIcon from '@mui/icons-material/Storage';
import DnsIcon from '@mui/icons-material/Dns'; // Icon for Swap
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Import Clock icon
import TimerIcon from '@mui/icons-material/Timer'; // Import Timer icon

// Helper to create the Gauge component
const Gauge = ({ value, label, color }) => {
    const theme = useTheme();
    const progressColor = color || theme.palette.primary.main;
    return (
        <Box sx={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress 
                variant="determinate" 
                value={100} 
                size={80} 
                thickness={4} 
                sx={{ color: theme.palette.grey[theme.palette.mode === 'dark' ? 700 : 300] }}
            />
            <CircularProgress 
                variant="determinate" 
                value={value || 0} 
                size={80} 
                thickness={4}
                sx={{
                    color: progressColor,
                    position: 'absolute',
                    left: 0,
                    transform: 'rotate(-90deg) !important' // Start from top
                }}
            />
            <Box
                sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <Typography variant="h6" component="div" color="text.primary">
                    {`${Math.round(value || 0)}%`}
                </Typography>
                 <Typography variant="caption" component="div" color="text.secondary">
                    {label}
                </Typography>
            </Box>
        </Box>
    );
};

const SystemStatusCard = ({ systemInfo }) => {
    const theme = useTheme();

    // Fallback for missing data
    const info = systemInfo || {
        cpuUsage: 0, memoryUsagePercent: 0, memoryUsed: 'N/A', memoryTotal: 'N/A',
        diskUsagePercent: 0, diskUsed: 'N/A', diskTotal: 'N/A',
        swapUsagePercent: 0, swapUsed: 'N/A', swapTotal: 'N/A',
        uptime: 'N/A',
        rawUptimeSeconds: 0, // Add default
        currentTime: 'N/A' // Add default
    };

    // Format current time for better readability
    const formatTime = (isoString) => {
        if (!isoString || isoString === 'N/A') return 'N/A';
        try {
            return new Date(isoString).toLocaleString();
        } catch (e) {
            return 'Invalid Date';
        }
    };
    
    // Format raw uptime seconds
    const formatRawUptime = (seconds) => {
        if (typeof seconds !== 'number' || seconds <= 0) return 'N/A';
        return `${seconds.toLocaleString()} seconds`;
    };

    return (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>System Status</Typography>
                <Grid container spacing={1} sx={{ mb: 2, fontSize: '0.8rem', color: 'text.secondary' }}>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                         <TimerIcon fontSize="inherit" sx={{ mr: 0.5 }} /> Uptime: {info.uptime}
                    </Grid>
                     <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                         <AccessTimeIcon fontSize="inherit" sx={{ mr: 0.5 }} /> Server Time: {formatTime(info.currentTime)}
                    </Grid>
                </Grid>
                
                {/* Gauges Row */}
                <Grid container spacing={2} sx={{ mb: 3, justifyContent: 'center' }}>
                    <Grid item xs={4} sx={{ textAlign: 'center'}}>
                        <Gauge value={info.cpuUsage} label="CPU" color={theme.palette.success.main} />
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'center'}}>
                         <Gauge value={info.memoryUsagePercent} label="Memory" color={theme.palette.secondary.main} />
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'center'}}>
                         <Gauge value={info.diskUsagePercent} label="Storage" color={theme.palette.info.main} />
                    </Grid>
                </Grid>

                {/* Detailed List */}
                <List dense disablePadding>
                    <ListItem>
                        <ListItemIcon sx={{minWidth: 40}}><SpeedIcon /></ListItemIcon>
                        <ListItemText primary="CPU" secondary={`${info.cpuUsage}%`} />
                    </ListItem>
                     <ListItem>
                        <ListItemIcon sx={{minWidth: 40}}><MemoryIcon /></ListItemIcon>
                        <ListItemText primary="Memory" secondary={`${info.memoryUsed} / ${info.memoryTotal} (${info.memoryUsagePercent}%)`} />
                    </ListItem>
                     <ListItem>
                        <ListItemIcon sx={{minWidth: 40}}><StorageIcon /></ListItemIcon>
                        <ListItemText primary="Storage" secondary={`${info.diskUsed} / ${info.diskTotal} (${info.diskUsagePercent}%)`} />
                    </ListItem>
                     <ListItem>
                        <ListItemIcon sx={{minWidth: 40}}><DnsIcon /></ListItemIcon>
                        <ListItemText primary="Swap" secondary={`${info.swapUsed} / ${info.swapTotal} (${info.swapUsagePercent}%)`} />
                    </ListItem>
                    {/* Add Uptime in seconds if needed, maybe less prominent */}
                    {/* <ListItem>
                        <ListItemIcon sx={{minWidth: 40}}><TimerIcon /></ListItemIcon>
                        <ListItemText primary="Raw Uptime" secondary={formatRawUptime(info.rawUptimeSeconds)} />
                    </ListItem> */}
                </List>
            </CardContent>
        </Card>
    );
};

export default SystemStatusCard; 