import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  Button,
  CircularProgress,
  Stack,
  Divider,
  TextField,
  Paper,
  LinearProgress,
  Alert,
  IconButton,
  Tooltip,
  Tab,
  Tabs,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { styled } from '@mui/material/styles';
import StorageIcon from '@mui/icons-material/Storage';
import TableChartIcon from '@mui/icons-material/TableChart';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';
import AddIcon from '@mui/icons-material/Add';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import HelpIcon from '@mui/icons-material/Help';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LockIcon from '@mui/icons-material/Lock';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import { useNavigate } from 'react-router-dom';
import AIService from '../services/AIService';
import DatabaseService from '../services/DatabaseService';

// Styled components
const RootStyle = styled('div')({
  height: '100%',
  padding: '24px'
});

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  color: theme.palette.common.white,
  backgroundImage: 'linear-gradient(to bottom right, #2065D1, #103996)',
  boxShadow: theme.shadows[3]
}));

const RegularCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: theme.shadows[2]
}));

const HealthCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: theme.shadows[2],
  background: (props) => {
    if (props.score >= 90) return 'linear-gradient(to right, #52c41a, #b7eb8f)';
    if (props.score >= 70) return 'linear-gradient(to right, #faad14, #ffd666)';
    return 'linear-gradient(to right, #f5222d, #ff7875)';
  },
  color: (props) => props.score >= 90 ? '#135200' : props.score >= 70 ? '#613400' : '#5c0011'
}));

const ProgressContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: 10,
  borderRadius: 5,
  backgroundColor: theme.palette.grey[200],
  marginTop: 8,
  marginBottom: 8
}));

const ProgressBar = styled(Box)(({ theme }) => ({
  position: 'absolute',
  height: '100%',
  borderRadius: 5
}));

const AiQueryBox = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(2)
}));

// Mock data - would be replaced with real API calls
const mockDatabases = [
  { name: 'Sample Database', engine: 'PostgreSQL', size: '128 MB', tables: 6, isSample: true }
];

const mockSystemInfo = {
  cpuUsage: 24,
  memoryUsage: 42,
  diskUsage: 68,
  uptime: '15 days, 7 hours'
};

// Mock health data
const mockHealthData = {
  "Sample Database": {
    score: 95,
    issues: [],
    warnings: []
  }
};

// Mock performance data
const mockPerformanceData = {
  querySpeed: {
    avg: 125, // ms
    p95: 350, // ms
    trend: 'stable'
  },
  cacheHitRatio: {
    value: 85, // percentage
    trend: 'improving'
  },
  slowQueries: [
    { id: 'q1', sql: 'SELECT * FROM large_table WHERE field NOT IN (SELECT...)', time: 2.3, count: 152 },
    { id: 'q2', sql: 'UPDATE users SET last_login = NOW() WHERE...', time: 1.8, count: 89 }
  ],
  deadlocks: {
    last24h: 2,
    trend: 'decreasing'
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [databases, setDatabases] = useState([]);
  const [systemInfo, setSystemInfo] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    uptime: ''
  });
  const [healthData, setHealthData] = useState({});
  const [performanceData, setPerformanceData] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiProvider, setAiProvider] = useState(null);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeDatabaseId, setActiveDatabaseId] = useState(null);

  // Dynamisch die API-Basis-URL basierend auf dem aktuellen Host ermitteln
  const getApiBaseUrl = () => {
    // Wenn die App auf dem gleichen Server wie die API läuft, können wir relative URLs verwenden
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    } 
    // Ansonsten verwenden wir den aktuellen Hostname mit Port 3001
    return `http://${window.location.hostname}:3001/api`;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAIQuery = async () => {
    if (!aiQuery) return;
    
    setAiLoading(true);
    setAiError(null);
    setAiResponse(null);
    
    try {
      // Use selected database connection ID, if any
      const connectionId = activeDatabaseId || null;
      
      // Query AI with selected provider
      const response = await AIService.query(aiQuery, connectionId, selectedProvider);
      
      setAiResponse(response);
      setAiProvider(response.provider);
    } catch (error) {
      console.error('Error querying AI:', error);
      setAiError('Failed to get response from AI assistant');
    } finally {
      setAiLoading(false);
    }
  };

  const handleProviderChange = (provider) => {
    setSelectedProvider(provider);
  };

  useEffect(() => {
    // Fetch real system data and databases
    const fetchData = async () => {
      setLoading(true);
      try {
        const apiBaseUrl = getApiBaseUrl();
        
        // Get system info
        const sysInfoResponse = await fetch(`${apiBaseUrl}/system/info`);
        if (!sysInfoResponse.ok) throw new Error('Failed to fetch system info');
        const sysInfoData = await sysInfoResponse.json();
        setSystemInfo(sysInfoData);

        // Get database connections from API
        const connections = await DatabaseService.getDatabaseConnections();
        let fetchedDatabases = [];
        let healthPromises = []; // Initialize health promises array
        
        if (connections && connections.length > 0) {
          // Fetch schema for each connection to get table count
          const enrichedConnections = await Promise.all(
            connections.map(async (conn) => {
              let tableCount = 'N/A';
              let size = 'N/A'; // Keep size as N/A for now
              if (conn.id && !conn.isSample) { // Only fetch schema for real connections with ID
                try {
                  const schemaInfo = await DatabaseService.getDatabaseSchema(conn.id);
                  if (schemaInfo.success && schemaInfo.tableColumns) {
                    tableCount = Object.keys(schemaInfo.tableColumns).length; 
                  } else {
                     console.warn(`Could not fetch schema for DB ID ${conn.id}:`, schemaInfo.message);
                  }
                  // Prepare health check promise here
                  healthPromises.push(
                     DatabaseService.getDatabaseHealth(conn.id).then(status => ({ id: conn.id, ...status }))
                  );
                } catch (schemaError) {
                  console.error(`Error fetching schema for DB ID ${conn.id}:`, schemaError);
                }
              }
              return { 
                ...conn, 
                size, // Keep size placeholder
                tables: tableCount // Use actual count or 'N/A'
              };
            })
          );
          setDatabases(enrichedConnections);
          fetchedDatabases = enrichedConnections; // Use enriched data
        } else {
          // Only show mock Sample DB if API returns empty
          setDatabases(mockDatabases);
          fetchedDatabases = []; // No real DBs to check health
        }
        
        // Fetch health status using promises collected earlier
        const healthResults = await Promise.all(healthPromises);
        const newHealthData = {};
        healthResults.forEach(result => {
          newHealthData[result.id] = { status: result.status, message: result.message };
        });
        setHealthData(newHealthData);
        
        // Fetch real performance data here if available, otherwise use mock
        setPerformanceData(mockPerformanceData); // Keep using mock for now

      } catch (error) {
        console.error("Failed to fetch data:", error);
        // Fallback to mock data if API fails
        setDatabases(mockDatabases); // Show sample on error
        setSystemInfo(mockSystemInfo);
        setHealthData({}); // Clear health data on error
        setPerformanceData(mockPerformanceData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up polling to update system info every 30 seconds
    const intervalId = setInterval(async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const sysInfoResponse = await fetch(`${apiBaseUrl}/system/info`);
        const sysInfoData = await sysInfoResponse.json();
        setSystemInfo(sysInfoData);
      } catch (error) {
        console.error("Failed to update system info:", error);
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Load available AI providers on mount
  useEffect(() => {
    const loadAISettings = async () => {
      try {
        // Get settings to see which provider is default
        const settings = await AIService.getSettings();
        if (settings && settings.defaultProvider) {
          setSelectedProvider(settings.defaultProvider);
        }
        
        // Get available providers 
        const providers = await AIService.getProviders();
        if (providers && providers.available_providers) {
          setAvailableProviders(providers.available_providers);
        }
      } catch (error) {
        console.error('Error loading AI settings:', error);
        // Default to SQLPal if we can't load settings
        setSelectedProvider('sqlpal');
      }
    };
    
    loadAISettings();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <RootStyle>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Overview of your database systems and performance
        </Typography>
      </Box>
      
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        <Tab label="Overview" />
        <Tab label="Health" />
        <Tab label="Performance" />
        <Tab label="AI Assistant" />
      </Tabs>
      
      {activeTab === 0 && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatsCard>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="h3" sx={{ mb: 0.5 }}>
                        {databases.length}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ opacity: 0.72 }}>
                        Databases
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}>
                      <StorageIcon />
                    </Box>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      variant="contained" 
                      size="small" 
                      onClick={() => navigate('/databases/create')}
                      startIcon={<AddIcon />}
                      sx={{ 
                        bgcolor: '#ffffff', 
                        color: '#0047AB',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        padding: '6px 12px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        '&:hover': {
                          bgcolor: '#f0f0f0',
                          boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
                        },
                        flex: 1
                      }}
                    >
                      Connect Database
                    </Button>
                    <Button 
                      variant="contained" 
                      size="small" 
                      onClick={() => navigate('/databases/new')}
                      startIcon={<AddIcon />}
                      sx={{ 
                        bgcolor: '#50C878', 
                        color: '#ffffff',
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        padding: '6px 12px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                        '&:hover': {
                          bgcolor: '#40A060',
                          boxShadow: '0 6px 12px rgba(0,0,0,0.4)',
                        },
                        flex: 1
                      }}
                    >
                      Create Database
                    </Button>
                  </Stack>
                </CardContent>
              </StatsCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <RegularCard>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h4" sx={{ mb: 0.5 }}>
                        {/* Safely calculate total tables, display N/A if any connection lacks count */}
                        {databases.some(db => typeof db.tables !== 'number') 
                          ? 'N/A' 
                          : databases.reduce((sum, db) => sum + (db.tables || 0), 0)}
                      </Typography>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total Tables
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1, bgcolor: 'primary.lighter', borderRadius: 1, color: 'primary.main' }}>
                      <TableChartIcon />
                    </Box>
                  </Box>
                </CardContent>
              </RegularCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <RegularCard>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h4" sx={{ mb: 0.5 }}>
                        {systemInfo.cpuUsage}%
                      </Typography>
                      <Typography variant="subtitle2" color="text.secondary">
                        CPU Usage
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1, bgcolor: 'primary.lighter', borderRadius: 1, color: 'primary.main' }}>
                      <MemoryIcon />
                    </Box>
                  </Box>
                </CardContent>
              </RegularCard>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <RegularCard>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h4" sx={{ mb: 0.5 }}>
                        {systemInfo.memoryUsage}%
                      </Typography>
                      <Typography variant="subtitle2" color="text.secondary">
                        Memory Usage
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1, bgcolor: 'primary.lighter', borderRadius: 1, color: 'primary.main' }}>
                      <SpeedIcon />
                    </Box>
                  </Box>
                </CardContent>
              </RegularCard>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <RegularCard>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6">Recent Databases</Typography>
                    <Button 
                      size="small" 
                      onClick={() => navigate('/databases')}
                      sx={{ textTransform: 'none' }}
                    >
                      View All
                    </Button>
                  </Box>
                  
                  {databases.map((db, index) => (
                    <React.Fragment key={db.id || db.name}>
                      <Box sx={{ py: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle1">{db.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{db.engine}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2">{db.size}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {typeof db.tables === 'number' ? `${db.tables} tables` : 'N/A'}
                            </Typography>
                          </Box>
                          <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => navigate(`/databases/${db.id}`)}
                            disabled={!db.id}
                          >
                            Connect
                          </Button>
                        </Stack>
                      </Box>
                      {index < databases.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </CardContent>
              </RegularCard>
            </Grid>

            <Grid item xs={12} md={4}>
              <RegularCard>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3 }}>
                    System Information
                  </Typography>
                  
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        CPU Usage
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <Box 
                            sx={{ 
                              height: 10, 
                              bgcolor: 'grey.200', 
                              borderRadius: 5,
                              position: 'relative'
                            }}
                          >
                            <Box 
                              sx={{
                                position: 'absolute',
                                height: '100%',
                                bgcolor: 'primary.main',
                                borderRadius: 5,
                                width: `${systemInfo.cpuUsage}%`
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.primary">
                          {systemInfo.cpuUsage}%
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Memory Usage
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <Box 
                            sx={{ 
                              height: 10, 
                              bgcolor: 'grey.200', 
                              borderRadius: 5,
                              position: 'relative'
                            }}
                          >
                            <Box 
                              sx={{
                                position: 'absolute',
                                height: '100%',
                                bgcolor: 'primary.main',
                                borderRadius: 5,
                                width: `${systemInfo.memoryUsage}%`
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.primary">
                          {systemInfo.memoryUsage}%
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Disk Usage
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ width: '100%', mr: 1 }}>
                          <Box 
                            sx={{ 
                              height: 10, 
                              bgcolor: 'grey.200', 
                              borderRadius: 5,
                              position: 'relative'
                            }}
                          >
                            <Box 
                              sx={{
                                position: 'absolute',
                                height: '100%',
                                bgcolor: 'primary.main',
                                borderRadius: 5,
                                width: `${systemInfo.diskUsage}%`
                              }}
                            />
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.primary">
                          {systemInfo.diskUsage}%
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        System Uptime
                      </Typography>
                      <Typography variant="body1">
                        {systemInfo.uptime}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </RegularCard>
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {databases.map((db) => {
            // Get health status for this specific DB ID
            const currentHealth = healthData[db.id] || { status: 'Unknown', message: 'Checking...' };
            // Determine card style based on health status
            let cardStyle = {};
            let statusColor = 'text.secondary';
            if (currentHealth.status === 'OK') {
              cardStyle = { borderLeft: '4px solid #52c41a', backgroundColor: 'rgba(82, 196, 26, 0.05)' };
              statusColor = 'success.main';
            } else if (currentHealth.status === 'Error') {
              cardStyle = { borderLeft: '4px solid #f5222d', backgroundColor: 'rgba(245, 34, 45, 0.05)' };
              statusColor = 'error.main';
            } else if (currentHealth.status === 'Unknown' && db.id) { // Only show 'Checking' for real DBs
                cardStyle = { borderLeft: '4px solid #faad14', backgroundColor: 'rgba(250, 173, 20, 0.05)' }; 
                statusColor = 'warning.main';
            }
            // Skip rendering health card for mock Sample DB if needed, or show basic info
            if (!db.id && db.isSample) {
                 return (
                    <Grid item xs={12} md={4} key={db.name}>
                        <RegularCard sx={{ ...cardStyle }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                    <Typography variant="h6">{db.name}</Typography>
                                    <HealthAndSafetyIcon color="disabled" />
                                </Box>
                                <Typography variant="body2" color="text.secondary">Health check not applicable.</Typography>
                            </CardContent>
                        </RegularCard>
                    </Grid>
                );
            }

            return (
                <Grid item xs={12} md={4} key={db.id}>
                  {/* Use RegularCard with dynamic style instead of HealthCard */}
                  <RegularCard sx={{ ...cardStyle }}> 
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">{db.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <HealthAndSafetyIcon sx={{ mr: 1, color: statusColor }} />
                          <Typography variant="subtitle1" sx={{ color: statusColor }}>
                            {currentHealth.status}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        {currentHealth.message}
                      </Typography>
                      
                      {/* Remove old score/issues/warnings rendering */}
                      
                    </CardContent>
                  </RegularCard>
                </Grid>
            );
          })}

          <Grid item xs={12}>
            <RegularCard>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">System Health Trends</Typography>
                  <Tooltip title="View detailed reports">
                    <IconButton size="small" onClick={() => navigate('/health/reports')}>
                      <TrendingUpIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Transaction Logs
                </Typography>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
                        <Typography variant="body2" color="text.secondary">
                          Average Growth Rate
                        </Typography>
                        <Typography variant="h6">
                          5.2 MB/hour
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
                        <Typography variant="body2" color="text.secondary">
                          Last Checkpoint
                        </Typography>
                        <Typography variant="h6">
                          23 min ago
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
                        <Typography variant="body2" color="text.secondary">
                          Backup Status
                        </Typography>
                        <Typography variant="h6" sx={{ color: 'success.main' }}>
                          Up to date
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
                
                <Typography variant="subtitle1" gutterBottom>
                  Performance Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Cache Hit Ratio
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'success.main' }}>
                          {performanceData.cacheHitRatio?.value || 0}%
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Deadlocks (24h)
                        </Typography>
                        <Typography variant="body1" sx={{ color: 'warning.main' }}>
                          {performanceData.deadlocks?.last24h || 0}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </RegularCard>
          </Grid>
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <RegularCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Query Performance
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Average Query Time
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AccessTimeIcon sx={{ color: 'primary.main', mr: 1 }} />
                        <Typography variant="h4">
                          {performanceData.querySpeed?.avg || 0} ms
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Box sx={{ textAlign: 'center', p: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        95th Percentile
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <SpeedIcon sx={{ color: 'warning.main', mr: 1 }} />
                        <Typography variant="h4">
                          {performanceData.querySpeed?.p95 || 0} ms
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle1" gutterBottom>
                  Slow Queries
                </Typography>
                
                {(performanceData.slowQueries || []).map((query, index) => (
                  <Paper 
                    key={query.id}
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      bgcolor: 'background.neutral',
                      borderLeft: '4px solid',
                      borderColor: 'warning.main'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="subtitle2">
                        Query #{index + 1}
                      </Typography>
                      <Typography variant="body2" color="error">
                        {query.time} sec ({query.count} executions)
                      </Typography>
                    </Box>
                    <Typography 
                      variant="body2" 
                      component="pre"
                      sx={{ 
                        p: 1, 
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        overflow: 'auto',
                        fontSize: '0.75rem'
                      }}
                    >
                      {query.sql}
                    </Typography>
                  </Paper>
                ))}
              </CardContent>
            </RegularCard>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <RegularCard>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Transaction Metrics
                </Typography>
                
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Active Transactions
                      </Typography>
                      <Typography variant="h4">
                        23
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Commits/sec
                      </Typography>
                      <Typography variant="h4">
                        142
                      </Typography>
                    </Box>
                  </Grid>
                  
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Rollbacks/sec
                      </Typography>
                      <Typography variant="h4">
                        3
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
                
                <Typography variant="subtitle1" gutterBottom>
                  Lock Contention
                </Typography>
                
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'background.neutral' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <LockIcon sx={{ color: 'info.main', mr: 1 }} />
                    <Typography variant="subtitle2">
                      Current Lock Wait Time
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ width: '100%', mr: 1 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={15} 
                        sx={{ height: 10, borderRadius: 1 }}
                      />
                    </Box>
                    <Typography variant="body2">
                      15%
                    </Typography>
                  </Box>
                </Paper>
                
                <Typography variant="subtitle1" gutterBottom>
                  Index Usage
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
                      <Typography variant="body2" color="text.secondary">
                        Most Used Index
                      </Typography>
                      <Typography variant="body1" noWrap>
                        idx_users_email
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
                      <Typography variant="body2" color="text.secondary">
                        Unused Indexes
                      </Typography>
                      <Typography variant="body1">
                        5
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </RegularCard>
          </Grid>
        </Grid>
      )}

      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              AI Assistant
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                Ask questions about your data in natural language
              </Typography>
              
              {availableProviders.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    AI Provider:
                  </Typography>
                  <ToggleButtonGroup
                    value={selectedProvider}
                    exclusive
                    onChange={(e, newValue) => handleProviderChange(newValue)}
                    size="small"
                  >
                    {availableProviders.map(provider => (
                      <ToggleButton key={provider} value={provider}>
                        {provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}
              
              <TextField
                fullWidth
                label="Ask a question about your data"
                variant="outlined"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAIQuery()}
                disabled={aiLoading}
                sx={{ mb: 2 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Ask AI Assistant">
                        <IconButton 
                          edge="end" 
                          onClick={handleAIQuery}
                          disabled={!aiQuery || aiLoading}
                        >
                          {aiLoading ? <CircularProgress size={24} /> : <SendIcon />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              
              {aiResponse && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Response using {aiProvider || 'AI'}:
                    </Typography>
                    
                    <Typography variant="body1" gutterBottom>
                      {aiResponse.formatted_results}
                    </Typography>
                    
                    {aiResponse.sql && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Generated SQL:
                        </Typography>
                        <Box sx={{ 
                          p: 1, 
                          bgcolor: 'background.paper', 
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: 'divider',
                          maxHeight: '100px',
                          overflow: 'auto'
                        }}>
                          <Typography variant="body2" component="pre" sx={{ margin: 0 }}>
                            {aiResponse.sql}
                          </Typography>
                        </Box>
                      </>
                    )}
                    
                    {aiResponse.results && aiResponse.results.length > 0 && (
                      <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                          Result Data:
                        </Typography>
                        <TableContainer component={Paper} sx={{ maxHeight: '200px' }}>
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                {Object.keys(aiResponse.results[0]).map(key => (
                                  <TableCell key={key}>{key}</TableCell>
                                ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {aiResponse.results.map((row, i) => (
                                <TableRow key={i}>
                                  {Object.values(row).map((value, j) => (
                                    <TableCell key={j}>
                                      {typeof value === 'object' ? JSON.stringify(value) : value}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {aiError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {aiError}
                </Alert>
              )}
              
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    Example questions:
                  </Typography>
                  <List dense>
                    <ListItem button onClick={() => setAiQuery('How many users are in the database?')}>
                      <ListItemText primary="How many users are in the database?" />
                    </ListItem>
                    <ListItem button onClick={() => setAiQuery('What is the average price of all products?')}>
                      <ListItemText primary="What is the average price of all products?" />
                    </ListItem>
                    <ListItem button onClick={() => setAiQuery('Show me the most expensive products')}>
                      <ListItemText primary="Show me the most expensive products" />
                    </ListItem>
                    <ListItem button onClick={() => setAiQuery('List all tables in the database')}>
                      <ListItemText primary="List all tables in the database" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Box>
          </Grid>
        </Grid>
      )}
    </RootStyle>
  );
} 