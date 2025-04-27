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
  Tabs
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
import { useNavigate } from 'react-router-dom';

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
  const [aiResponse, setAiResponse] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Dynamisch die API-Basis-URL basierend auf dem aktuellen Host ermitteln
  const getApiBaseUrl = () => {
    // Wenn die App auf dem gleichen Server wie die API läuft, können wir relative URLs verwenden
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    } 
    // Ansonsten verwenden wir den aktuellen Hostname mit Port 5000
    return `http://${window.location.hostname}:5000`;
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleAiQuerySubmit = async () => {
    if (!aiQuery.trim()) return;
    
    setIsAnalyzing(true);
    setAiResponse('');
    
    try {
      // Get the API base URL
      const apiBaseUrl = getApiBaseUrl();
      
      // Make API call to AI query endpoint
      const response = await fetch(`${apiBaseUrl}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiQuery })
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setAiResponse(data.result);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setAiResponse('Sorry, I encountered an error analyzing your database. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Fetch real system data and databases
    const fetchData = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        
        // Get system info
        const sysInfoResponse = await fetch(`${apiBaseUrl}/api/system/info`);
        const sysInfoData = await sysInfoResponse.json();
        
        // Überprüfen Sie LocalStorage auf echte Datenbanken
        const storedDatabases = localStorage.getItem('mole_real_databases');
        const realDatabases = storedDatabases ? JSON.parse(storedDatabases) : [];
        
        if (realDatabases.length > 0) {
          setDatabases(realDatabases);
        } else {
          // Nur eine Demo-Datenbank anzeigen, wenn keine echten Datenbanken vorhanden sind
          setDatabases(mockDatabases);
        }
        
        setSystemInfo(sysInfoData);
        
        // In a real implementation, we would fetch these from the API too
        setHealthData(mockHealthData);
        setPerformanceData(mockPerformanceData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        // Fallback to mock data if API fails
        
        // Überprüfen Sie LocalStorage auf echte Datenbanken
        const storedDatabases = localStorage.getItem('mole_real_databases');
        const realDatabases = storedDatabases ? JSON.parse(storedDatabases) : [];
        
        if (realDatabases.length > 0) {
          setDatabases(realDatabases);
        } else {
          // Nur eine Demo-Datenbank anzeigen, wenn keine echten Datenbanken vorhanden sind
          setDatabases(mockDatabases);
        }
        
        setSystemInfo(mockSystemInfo);
        setHealthData(mockHealthData);
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
        const sysInfoResponse = await fetch(`${apiBaseUrl}/api/system/info`);
        const sysInfoData = await sysInfoResponse.json();
        setSystemInfo(sysInfoData);
      } catch (error) {
        console.error("Failed to update system info:", error);
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
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
                        {databases.reduce((sum, db) => sum + db.tables, 0)}
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
                    <React.Fragment key={db.name}>
                      <Box sx={{ py: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle1">{db.name}</Typography>
                            <Typography variant="body2" color="text.secondary">{db.engine}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="body2">{db.size}</Typography>
                            <Typography variant="body2" color="text.secondary">{db.tables} tables</Typography>
                          </Box>
                          <Button 
                            variant="outlined" 
                            size="small"
                            onClick={() => navigate(`/databases/${db.name}`)}
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
          {databases.map((db) => (
            <Grid item xs={12} md={4} key={db.name}>
              <HealthCard score={healthData[db.name]?.score || 0}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">{db.name}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <HealthAndSafetyIcon sx={{ mr: 1 }} />
                      <Typography variant="h4">{healthData[db.name]?.score || 'N/A'}</Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight="medium">Health Score</Typography>
                    <ProgressContainer>
                      <ProgressBar 
                        sx={{ 
                          width: `${healthData[db.name]?.score || 0}%`,
                          bgcolor: (theme) => {
                            const score = healthData[db.name]?.score || 0;
                            if (score >= 90) return theme.palette.success.main;
                            if (score >= 70) return theme.palette.warning.main;
                            return theme.palette.error.main;
                          }
                        }} 
                      />
                    </ProgressContainer>
                  </Box>
                  
                  {(healthData[db.name]?.issues || []).length > 0 && (
                    <Alert 
                      severity="error" 
                      icon={<WarningIcon />}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle2">Issues Found</Typography>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {(healthData[db.name]?.issues || []).map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  
                  {(healthData[db.name]?.warnings || []).length > 0 && (
                    <Alert 
                      severity="warning"
                      icon={<InfoIcon />}
                    >
                      <Typography variant="subtitle2">Warnings</Typography>
                      <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                        {(healthData[db.name]?.warnings || []).map((warning, i) => (
                          <li key={i}>{warning}</li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  
                  {(healthData[db.name]?.issues || []).length === 0 && 
                   (healthData[db.name]?.warnings || []).length === 0 && 
                    <Alert severity="success">All systems operational!</Alert>
                  }
                </CardContent>
              </HealthCard>
            </Grid>
          ))}

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
            <RegularCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SmartToyIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    AI Database Assistant
                  </Typography>
                </Box>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  Ask questions about your database in natural language. The AI will analyze your data and provide insights.
                </Typography>
                
                <AiQueryBox>
                  <TextField
                    fullWidth
                    variant="outlined"
                    label="Ask a question about your database"
                    placeholder="e.g., What was the highest temperature recorded in the weather_data table?"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    InputProps={{
                      endAdornment: (
                        <Button 
                          variant="contained"
                          onClick={handleAiQuerySubmit}
                          disabled={isAnalyzing || !aiQuery.trim()}
                        >
                          {isAnalyzing ? 'Analyzing...' : 'Ask AI'}
                        </Button>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                  
                  {isAnalyzing && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Analyzing your database...
                      </Typography>
                      <LinearProgress />
                    </Box>
                  )}
                  
                  {aiResponse && (
                    <Paper 
                      elevation={0}
                      sx={{ 
                        p: 3, 
                        bgcolor: 'background.neutral',
                        borderRadius: 2,
                        borderLeft: '4px solid',
                        borderColor: 'primary.main'
                      }}
                    >
                      <Typography variant="subtitle1" paragraph>
                        AI Analysis Result
                      </Typography>
                      <Typography variant="body1">
                        {aiResponse}
                      </Typography>
                    </Paper>
                  )}
                </AiQueryBox>
                
                <Divider sx={{ my: 3 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Sample Questions You Can Ask:
                </Typography>
                
                <Grid container spacing={2}>
                  {[
                    "What was the highest value recorded in column X?",
                    "How has the average order value changed over the past year?",
                    "Which user has the most transactions in the database?",
                    "What's the distribution of values in the status column?",
                    "When do we see peak activity in our system?",
                    "What are the common patterns in our failed transactions?"
                  ].map((question, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Button 
                        fullWidth
                        variant="outlined"
                        color="primary"
                        sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                        onClick={() => {
                          setAiQuery(question);
                          setAiResponse('');
                        }}
                      >
                        {question}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </RegularCard>
          </Grid>
        </Grid>
      )}
    </RootStyle>
  );
} 