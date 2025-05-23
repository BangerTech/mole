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
  ListItemText,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
  ListItemIcon,
  Avatar,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails
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
import BarChartIcon from '@mui/icons-material/BarChart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import AIService from '../services/AIService';
import DatabaseService from '../services/DatabaseService';
import SystemService from '../services/SystemService';
import EventService from '../services/EventService';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UpdateIcon from '@mui/icons-material/Update';
import SystemStatusCard from '../components/SystemStatusCard';
import { formatBytes } from '../utils/formatUtils';
// Import Chart.js components
import {
    Chart as ChartJS, 
    ArcElement, 
    Tooltip as ChartTooltip, // Rename Tooltip to avoid conflict with MUI Tooltip 
    Legend,
    CategoryScale, // Needed for x-axis labels
    LinearScale,   // Needed for y-axis values
    PointElement,  // Needed for points on the line
    LineElement,   // Needed for the line itself
    Title          // Optional: For chart titles
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    ArcElement, 
    ChartTooltip, 
    Legend, 
    CategoryScale, 
    LinearScale, 
    PointElement, 
    LineElement,
    Title 
);

// Styled components
const RootStyle = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh', // Mindestens die volle Viewport-Höhe
  padding: theme.spacing(0, 3, 3, 3), // Set paddingTop to 0, keep others at theme.spacing(3)
  boxSizing: 'border-box',
  // overflowY: 'auto', // Vorerst auskommentiert, da dies oft globaler gehandhabt wird
}));

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  color: theme.palette.common.white,
  backgroundImage: 'linear-gradient(to bottom right, #2065D1, #103996)',
  boxShadow: theme.shadows[8]
}));

const RegularCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: theme.shadows[4]
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

const RecentDbCard = styled(Card)(({ theme, status }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  borderLeft: `5px solid ${ 
    status === 'OK' ? theme.palette.success.main : 
    status === 'Error' ? theme.palette.error.main : 
    theme.palette.warning.main // Default to warning for Unknown/Checking
  }`,
  boxShadow: theme.shadows[4],
  transition: 'transform 0.3s, box-shadow 0.3s',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[12],
    cursor: 'pointer'
  }
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

// Helper to get engine icon (revert to using MUI StorageIcon)
const getEngineIcon = (engine) => {
  switch (engine?.toLowerCase()) {
    case 'postgresql':
    case 'postgres':
      return <StorageIcon color="info" />; 
    case 'mysql':
      return <StorageIcon color="warning" />;
    case 'sqlite':
      return <StorageIcon color="success" />;
    default:
      return <StorageIcon color="disabled" />;
  }
};

// Helper to get status icon
const getStatusIcon = (status) => {
   switch (status) {
     case 'OK':
       return <CheckCircleIcon color="success" fontSize="small" />;
     case 'Error':
       return <ErrorIcon color="error" fontSize="small" />;
     default:
       return <HelpOutlineIcon color="warning" fontSize="small" />;
   }
};

// Helper function to parse size string (e.g., "22 MB", "1.5 GB") into bytes
const parseSizeToBytes = (sizeStr) => {
  if (!sizeStr || typeof sizeStr !== 'string') return 0;
  const sizeMatch = sizeStr.match(/([\d.]+)\s*(Bytes|KB|MB|GB|TB)/i);
  if (sizeMatch) {
    const value = parseFloat(sizeMatch[1]);
    const unit = sizeMatch[2].toUpperCase();
    switch (unit) {
      case 'BYTES': return value;
      case 'KB': return value * 1024;
      case 'MB': return value * 1024 * 1024;
      case 'GB': return value * 1024 * 1024 * 1024;
      case 'TB': return value * 1024 * 1024 * 1024 * 1024;
      default: return 0;
    }
  }
  return 0;
};

// Helper to get Event Icon
const getEventIcon = (eventType) => {
   switch (eventType) {
      case 'CONNECTION_CREATED':
          return <AddCircleOutlineIcon color="success" />;
      case 'CONNECTION_UPDATED':
          return <UpdateIcon color="info" />;
      case 'CONNECTION_DELETED':
          return <DeleteOutlineIcon color="error" />;
      case 'HEALTH_ERROR': // Example for future
          return <WarningIcon color="warning" />;
      default:
          return <EventNoteIcon color="action" />;
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
  const [cpuHistory, setCpuHistory] = useState([]);
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [topTables, setTopTables] = useState([]);
  const [totalDbSize, setTotalDbSize] = useState('N/A');
  const [healthSummary, setHealthSummary] = useState({ ok: 0, error: 0, unknown: 0 });
  const [error, setError] = useState(null);

  // New states for potentially real data
  const [detailedHealthInfo, setDetailedHealthInfo] = useState({}); // For Health tab details
  const [performanceMetrics, setPerformanceMetrics] = useState({}); // For Performance tab details
  const [isHealthDetailsLoading, setIsHealthDetailsLoading] = useState(false);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);
  const [currentDbStorageInfo, setCurrentDbStorageInfo] = useState({ loading: false, sizeFormatted: 'N/A', error: null });
  const [currentDbTransactionStats, setCurrentDbTransactionStats] = useState({ loading: false, activeTransactions: 'N/A', totalCommits: 'N/A', totalRollbacks: 'N/A', error: null });

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
    // Fetch real system data, databases, events, and top tables
    const fetchData = async () => {
      setLoading(true);
      let calculatedTotalSize = 0;
      let calculatedOk = 0;
      let calculatedError = 0;
      let calculatedUnknown = 0;
      let fetchedConnections = []; // Store fetched connections here

      try {
        const apiBaseUrl = getApiBaseUrl();
        
        // Use SystemService for current info
        const sysInfoData = await SystemService.getSystemInfo();
        setSystemInfo(sysInfoData);

        // Fetch historical data
        const cpuHistoryPromise = SystemService.getPerformanceHistory('cpu', 30);
        const memoryHistoryPromise = SystemService.getPerformanceHistory('memory', 30);

        // Fetch top tables (concurrently)
        const topTablesPromise = DatabaseService.getTopTables(10);

        // Get database connections from API
        const connections = await DatabaseService.getDatabaseConnections();
        fetchedConnections = Array.isArray(connections) ? connections : []; // Assign to outer scope
        
        // --- Fetch Storage Info for ALL connections --- 
        let storageInfoPromises = [];
        if (fetchedConnections.length > 0) {
            storageInfoPromises = fetchedConnections.map(conn => 
                DatabaseService.getStorageInfo(conn.id).catch(err => {
                    console.error(`Error fetching storage info for ${conn.id}:`, err);
                    return { success: false, sizeBytes: 0, message: err.message }; // Return error state
                })
            );
        }
        const storageResults = await Promise.all(storageInfoPromises);
        
        // Calculate total size from successful storage info results
        calculatedTotalSize = storageResults.reduce((sum, result) => {
            // Check if the result has success: true and sizeBytes property
            if (result && result.success && typeof result.sizeBytes === 'number') {
                return sum + result.sizeBytes;
            }
            return sum;
        }, 0);
        setTotalDbSize(formatBytes(calculatedTotalSize)); // Set total size state
        // ------------------------------------------------

        // --- Enrich connections with Table Count and Individual Size --- 
        let finalDatabasesToShow = [];
        if (fetchedConnections.length > 0) {
             finalDatabasesToShow = await Promise.all(
                 fetchedConnections.map(async (conn) => {
                     let tableCount = 0; // Default to 0
                     // Find corresponding storage result using the connectionId (handle type difference)
                     let storageResult = storageResults.find(res => String(res?.connectionId) === String(conn.id));
                     let displaySize = storageResult?.sizeFormatted || 'N/A'; // Use size from storage info if found
                     
                     if (conn.id === 'sample') {
                         // Sample DB handled correctly by the backend service now
                         // Use values directly if storageResult found, otherwise use defaults
                         displaySize = storageResult?.sizeFormatted || '128 MB'; 
                         tableCount = 6; 
                     } else {
                         // Fetch schema ONLY for table count if needed by UI
                         // Size is now correctly sourced from storageResult
                         try {
                            const schemaInfo = await DatabaseService.getDatabaseSchema(conn.id);
                            if (schemaInfo.success && schemaInfo.tables) {
                                tableCount = schemaInfo.tables.length;
                            } else {
                                console.warn(`Schema fetch failed for table count (DB ID ${conn.id}):`, schemaInfo.message);
                            }
                         } catch (schemaError) {
                            console.error(`Error fetching schema for table count (DB ID ${conn.id}):`, schemaError);
                         }
                     }
                     
                     return { 
                         ...conn, 
                         size: displaySize, // Display size per card (now correctly sourced)
                         tables: typeof tableCount === 'number' ? tableCount : 0, // Ensure 'tables' is a number
                     };
                 })
             );
        } else {
            finalDatabasesToShow = fetchedConnections;
        }
        setDatabases(finalDatabasesToShow);
        // -------------------------------------------------------------

        // --- Prepare and fetch health checks --- 
        const healthPromises = finalDatabasesToShow
            .filter(db => db.id) // Filter out any potentially invalid entries
            .map(db => 
                DatabaseService.getDatabaseHealth(db.id)
                    .then(status => ({ id: db.id, ...status }))
                    .catch(err => {
                        console.error(`Error fetching health for ${db.id}:`, err);
                        return { id: db.id, status: 'Error', message: 'Failed to fetch health' }; // Return error state
                    })
            );
        const healthResults = await Promise.all(healthPromises);
        const newHealthData = {};
        healthResults.forEach(result => {
          newHealthData[result.id] = { status: result.status, message: result.message };
          // Count health status for summary
          if (result.status === 'OK') calculatedOk++;
          else if (result.status === 'Error') calculatedError++;
          else calculatedUnknown++;
        });
        setHealthData(newHealthData);
        setHealthSummary({ ok: calculatedOk, error: calculatedError, unknown: calculatedUnknown });
        // -------------------------------------------
        
        // Conditional loading of Health Details and Performance Data
        // TODO: Implement API calls to fetch real detailed health and performance data
        // For now, we use mock data only for the sample database
        const sampleDbExists = finalDatabasesToShow.some(db => db.isSample);
        if (sampleDbExists) { 
          // If sample DB exists, populate its data from mocks
          setDetailedHealthInfo(prev => ({ ...prev, 'sample': mockHealthData["Sample Database"] })); // Assuming sample DB ID is 'sample' or similar
          setPerformanceMetrics(prev => ({ ...prev, 'sample': mockPerformanceData }));
        } else {
          // If no sample DB, or for real DBs, clear/initialize (later fetch real data)
          setDetailedHealthInfo({}); 
          setPerformanceMetrics({}); 
        }

        // Wait for history and top tables data
        const [cpuRes, memRes, topTablesResult] = await Promise.all([
          cpuHistoryPromise, 
          memoryHistoryPromise,
          topTablesPromise
        ]);
        if (cpuRes?.success) setCpuHistory(cpuRes.history);
        if (memRes?.success) setMemoryHistory(memRes.history);
        setTopTables(topTablesResult || []); // Set top tables state

        // Fetch recent events
        const recentEvents = await EventService.getRecentEvents(10); // Get last 10 events
        setEvents(recentEvents || []); // Ensure it's an array

      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError(`Dashboard Error: ${error.message}`); // Set error state
        // Keep potentially partially loaded data or clear it?
        // Clearing might be safer
        setDatabases([]); 
        setSystemInfo({ cpuUsage: 0, memoryUsage: 0, diskUsage: 0, uptime: 'Error' });
        setHealthData({}); 
        setPerformanceData({});
        setCpuHistory([]);
        setMemoryHistory([]);
        setEvents([]);
        setTopTables([]);
        setTotalDbSize('Error');
        setHealthSummary({ ok: 0, error: 0, unknown: 0 });
        setDetailedHealthInfo({});
        setPerformanceMetrics({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Set up polling to update system info every 30 seconds
    const intervalId = setInterval(async () => {
      try {
        // const apiBaseUrl = getApiBaseUrl(); // This was 'http://hostname:3001/api/databases'
        // const sysInfoResponse = await fetch(`${apiBaseUrl}/system/info`); // This resulted in /api/databases/system/info

        // Corrected URL construction:
        const hostname = window.location.hostname;
        const sysInfoResponse = await fetch(`http://${hostname}:3001/api/system/info`); // Targets http://hostname:3001/api/system/info

        const sysInfoData = await sysInfoResponse.json();
        // Check if response indicates an error from the backend service
        if (sysInfoResponse.ok) {
            setSystemInfo(sysInfoData);
        } else {
             throw new Error(sysInfoData.message || `HTTP error ${sysInfoResponse.status}`);
        }
      } catch (fetchError) {
        console.error("Failed to update system info:", fetchError);
        // Use the state setter function correctly
        setError(`System Info Update Error: ${fetchError.message}`); 
      }
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array means this runs once on mount

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

  // Set initial activeDatabaseId when databases load or change
  useEffect(() => {
    if (!activeDatabaseId && databases && databases.length > 0) {
      // Find the first non-sample database
      const firstRealDb = databases.find(db => db.id && !db.isSample);
      if (firstRealDb) {
        setActiveDatabaseId(firstRealDb.id);
      } else if (databases[0]?.id) { // Fallback to the first one if only sample exists
        setActiveDatabaseId(databases[0].id);
      }
    }
    // If the currently active ID is no longer in the list, reset it
    else if (activeDatabaseId && !databases.some(db => db.id === activeDatabaseId)) {
         const firstRealDb = databases.find(db => db.id && !db.isSample);
         setActiveDatabaseId(firstRealDb ? firstRealDb.id : (databases[0]?.id || null));
    }
  }, [databases, activeDatabaseId]); // Rerun when databases list changes

  // Fetch detailed info (like storage) when activeDatabaseId changes
  useEffect(() => {
    const fetchActiveDbDetails = async () => {
      // Only fetch if active ID exists and it's not the sample DB
      const activeDb = databases.find(db => db.id === activeDatabaseId);
      if (activeDatabaseId && activeDb && !activeDb.isSample) {
        // Fetch Storage Info
        setCurrentDbStorageInfo({ loading: true, sizeFormatted: 'Loading...', error: null });
        // Fetch Transaction Stats
        setCurrentDbTransactionStats({ loading: true, activeTransactions: '...', totalCommits: '...', totalRollbacks: '...', error: null });
        try {
          // Fetch both concurrently
          const [storageInfo, transStats] = await Promise.all([
            DatabaseService.getStorageInfo(activeDatabaseId),
            DatabaseService.getTransactionStats(activeDatabaseId)
          ]);

          if (storageInfo.success) {
            setCurrentDbStorageInfo({ loading: false, sizeFormatted: storageInfo.sizeFormatted, error: null });
          } else {
            throw new Error(storageInfo.message || 'Failed to fetch storage info');
          }

          if (transStats.success) {
              setCurrentDbTransactionStats({
                  loading: false,
                  activeTransactions: transStats.activeTransactions,
                  totalCommits: transStats.totalCommits,
                  totalRollbacks: transStats.totalRollbacks,
                  error: null
              });
          } else {
              // Handle transaction stats specific error without throwing a general one if storage worked
              console.error(`Error fetching transaction stats for DB ${activeDatabaseId}:`, transStats.message);
              setCurrentDbTransactionStats({ loading: false, activeTransactions: 'Error', totalCommits: 'Error', totalRollbacks: 'Error', error: transStats.message });
          }

        } catch (err) {
          console.error(`Error fetching storage info for DB ${activeDatabaseId}:`, err);
          setCurrentDbStorageInfo({ loading: false, sizeFormatted: 'Error', error: err.message });
          // If the general catch is hit, ensure transaction stats are also marked as error/default
          if (currentDbTransactionStats.loading) { // Check if it was still loading
              setCurrentDbTransactionStats({ loading: false, activeTransactions: 'Error', totalCommits: 'Error', totalRollbacks: 'Error', error: err.message });
          }
        }
      } else {
        // Clear info if no active real DB or if sample is active
        setCurrentDbStorageInfo({ loading: false, sizeFormatted: 'N/A', error: null });
        setCurrentDbTransactionStats({ loading: false, activeTransactions: 'N/A', totalCommits: 'N/A', totalRollbacks: 'N/A', error: null });
      }
    };

    fetchActiveDbDetails();
  }, [activeDatabaseId, databases]); // Re-run when activeDatabaseId or the databases list changes

  const handleActiveDatabaseChange = (event) => {
      setActiveDatabaseId(event.target.value);
  };

  // Prepare data for Doughnut chart
  const topDatabasesBySize = databases
    .filter(db => db.id && !db.isSample && db.size && db.size !== 'N/A') // Filter for real DBs with size
    .map(db => ({ ...db, sizeBytes: parseSizeToBytes(db.size) })) // Add size in bytes
    .sort((a, b) => b.sizeBytes - a.sizeBytes) // Sort descending by size
    .slice(0, 5); // Take top 5

  const doughnutData = {
    labels: topDatabasesBySize.map(db => db.name),
    datasets: [
      {
        label: 'Database Size',
        data: topDatabasesBySize.map(db => db.sizeBytes),
        backgroundColor: [
          'rgba(33, 150, 243, 0.7)', // Blue
          'rgba(76, 175, 80, 0.7)',  // Green
          'rgba(255, 193, 7, 0.7)',  // Amber
          'rgba(244, 67, 54, 0.7)',   // Red
          'rgba(156, 39, 176, 0.7)', // Purple
        ],
        borderColor: [
          'rgba(33, 150, 243, 1)',
          'rgba(76, 175, 80, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(244, 67, 54, 1)',
          'rgba(156, 39, 176, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom', // Position legend at the bottom
        labels: {
           boxWidth: 12, // Smaller legend color boxes
           padding: 15 // Padding between legend items
        }
      },
      tooltip: { // Use ChartTooltip alias
        callbacks: {
          label: function(context) {
             let label = context.dataset.label || '';
             if (label) {
                 label += ': ';
             }
             if (context.parsed !== null) {
                 // Format bytes back to human-readable
                 const bytes = context.parsed;
                 const k = 1024;
                 const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
                 const i = Math.floor(Math.log(bytes) / Math.log(k));
                 label += parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
             }
             return label;
          }
        }
      }
    }
  };

  // Prepare data for Sparkline charts
  const sparklineBaseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: { display: false }, // Hide x-axis labels
        y: { display: false, min: 0, max: 100 } // Hide y-axis, set scale 0-100
    },
    plugins: {
        legend: { display: false }, // Hide legend
        tooltip: { enabled: false } // Disable tooltips
    },
    elements: {
        point: { radius: 0 }, // Hide points
        line: { tension: 0.3, borderWidth: 2 } // Smoothed line, thinner border
    }
  };

  const cpuSparklineData = {
    labels: cpuHistory.map(h => h.timestamp), // Timestamps for potential tooltips later
    datasets: [{
      label: 'CPU %',
      data: cpuHistory.map(h => h.value),
      borderColor: 'rgb(33, 150, 243)',
      backgroundColor: 'rgba(33, 150, 243, 0.1)', // Optional fill
      fill: true
    }]
  };

   const memorySparklineData = {
    labels: memoryHistory.map(h => h.timestamp),
    datasets: [{
      label: 'Memory %',
      data: memoryHistory.map(h => h.value),
      borderColor: 'rgb(76, 175, 80)',
      backgroundColor: 'rgba(76, 175, 80, 0.1)', 
      fill: true
    }]
  };

  if (loading) {
    // Show Skeleton Layout while loading
    return (
      <RootStyle>
         <Box sx={{ mb: 5 }}>
            <Skeleton variant="text" width={250} height={40} />
            <Skeleton variant="text" width={400} height={20} />
         </Box>
          <Skeleton variant="rectangular" width="100%" height={48} sx={{ mb: 3 }} />

          {/* Updated Skeleton Layout */}
           <Grid container spacing={3} sx={{ mb: 4 }}>
             {/* Row 1: DB Count, Table Count */}
             <Grid item xs={12} sm={6} md={3}><Skeleton variant="rounded" height={180} /></Grid>
             <Grid item xs={12} sm={6} md={3}><Skeleton variant="rounded" height={180} /></Grid>
             {/* Placeholder for where the detailed system status card will go */} 
             <Grid item xs={12} md={6}><Skeleton variant="rounded" height={180} /></Grid> 
          </Grid>
          <Grid container spacing={3}>
             {/* Row 2: Recent DBs */}
             <Grid item xs={12} md={8}><Skeleton variant="rounded" height={400} /></Grid>
             {/* Placeholder for new cards that will be below System Status */}
             <Grid item xs={12} md={4}><Skeleton variant="rounded" height={400} /></Grid>
          </Grid>
      </RootStyle>
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
          {/* Stats Cards Grid - Now 4 cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
             <Grid item xs={12} sm={6} md={3}>
                {/* Databases Card */} 
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
                      <Stack 
                        direction={{ xs: 'column', sm: 'row' }} // Stack vertically on xs, row on sm and up
                        spacing={1} 
                        sx={{ mt: 'auto' }} // Push stack to bottom if needed
                      >
                         <Button 
                            variant="contained" 
                            size="small" 
                            onClick={() => navigate('/databases/create')} // Assuming this is connect/add existing
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
                              flex: 1 // Allow buttons to take equal space in row layout
                            }}
                         >
                            Connect Database
                         </Button>
                         <Button 
                            variant="contained" 
                            size="small" 
                            onClick={() => navigate('/databases/new')} // Navigate to create new page
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
                              flex: 1 // Allow buttons to take equal space in row layout
                            }}
                         >
                            Create Database
                         </Button>
                      </Stack>
                   </CardContent>
                 </StatsCard>
             </Grid>
             <Grid item xs={12} sm={6} md={3}>
                 {/* Total Tables Card */} 
                 <RegularCard>
                    <CardContent>
                       <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                          <Box>
                             <Typography variant="h4" sx={{ mb: 0.5 }}>
                                {/* Safely calculate total tables, display N/A if any connection lacks count */}
                                {loading ? <Skeleton width={60} /> : 
                                 databases.reduce((sum, db) => sum + (db.tables || 0), 0)
                                }
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
                  {/* Total Size Card (New) */} 
                   <RegularCard>
                      <CardContent>
                         <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                           <Box>
                              <Typography variant="h4" sx={{ mb: 0.5 }}>{totalDbSize}</Typography>
                              <Typography variant="subtitle2" color="text.secondary">Total Size</Typography>
                           </Box>
                           <Box sx={{ p: 1, bgcolor: 'secondary.lighter', borderRadius: 1, color: 'secondary.main' }}>
                              <StorageIcon />{/* Or a specific size icon */}
                           </Box>
                        </Box>
                      </CardContent>
                   </RegularCard>
              </Grid>
               <Grid item xs={12} sm={6} md={3}>
                   {/* Health Summary Card (New) */} 
                    <RegularCard>
                       <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                            <Box>
                               <Typography variant="h4" sx={{ mb: 0.5 }}>
                                 <Typography component="span" variant="h4" color="success.main">{healthSummary.ok}</Typography> / 
                                 <Typography component="span" variant="h4" color="error.main">{healthSummary.error}</Typography>
                               </Typography>
                               <Typography variant="subtitle2" color="text.secondary">Connections OK / Error</Typography>
                            </Box>
                            <Box sx={{ p: 1, bgcolor: healthSummary.error > 0 ? 'error.lighter' : 'success.lighter', borderRadius: 1, color: healthSummary.error > 0 ? 'error.main' : 'success.main' }}>
                               <HealthAndSafetyIcon />
                            </Box>
                          </Box>
                       </CardContent>
                    </RegularCard>
               </Grid>
          </Grid>

          {/* Second Row: Recent DBs and System Status */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
             {/* Recent Databases Section */}
             <Grid item xs={12} md={8}>
                 <Box> 
                   <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">Recent Databases</Typography>
                      <Button size="small" onClick={() => navigate('/databases')} sx={{ textTransform: 'none' }}>View All</Button>
                   </Box>
                  <Grid container spacing={3}>
                     {databases.map((db) => {
                         const currentHealth = healthData[db.id] || { status: 'Unknown', message: '...' };
                         return (
                            <Grid item xs={12} sm={6} /* Adjusted size */ key={db.id || db.name}>
                                <RecentDbCard 
                                    status={currentHealth.status} 
                                    onClick={() => db.id && navigate(`/database/id/${db.id}`)} 
                                    sx={{ cursor: db.id ? 'pointer' : 'default'}}
                                >
                                     <CardContent sx={{ flexGrow: 1 }}>
                                         <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                                             {getEngineIcon(db.engine)}
                                             <Typography variant="h6" sx={{ ml: 1.5, flexGrow: 1 }} noWrap>
                                                 {db.name}
                                             </Typography>
                                             <Tooltip title={currentHealth.message || currentHealth.status}>
                                               <Box sx={{ display: 'flex' }}>{getStatusIcon(currentHealth.status)}</Box>
                                             </Tooltip>
                                         </Box>
                                         <Divider sx={{ mb: 1.5 }}/>
                                         <Stack direction="row" justifyContent="space-around" textAlign="center">
                                              <Box>
                                                 <Typography variant="body2" color="text.secondary">Engine</Typography>
                                                 <Typography variant="subtitle2">{db.engine}</Typography>
                                              </Box>
                                               <Box>
                                                 <Typography variant="body2" color="text.secondary">Tables</Typography>
                                                 <Typography variant="subtitle2">{typeof db.tables === 'number' ? db.tables : 'N/A'}</Typography>
                                              </Box>
                                              <Box>
                                                  <Typography variant="body2" color="text.secondary">Size</Typography>
                                                  <Typography variant="subtitle2">{db.size}</Typography>
                                              </Box>
                                         </Stack>
                                     </CardContent>
                                </RecentDbCard>
                            </Grid>
                         );
                      })}
                      {databases.length === 0 && !loading && (
                         <Grid item xs={12}> 
                           <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
                             No database connections found. 
                             <Button size="small" onClick={() => navigate('/databases/create')} sx={{ ml: 1 }}>Add one?</Button>
                           </Typography>
                         </Grid>
                      )}
                  </Grid>
                </Box>
             </Grid>

             {/* System Status Card */} 
             <Grid item xs={12} md={4}>
                 <SystemStatusCard systemInfo={systemInfo} />
             </Grid>
          </Grid>
          
          {/* Third Row: Additional Cards (Size Dist, Top Tables, Activity) */}
          <Grid container spacing={3}>
             {/* Database Size Distribution Card */} 
             {topDatabasesBySize.length > 0 && (
                 <Grid item xs={12} md={4}>
                     <RegularCard>
                        <CardContent>
                           <Typography variant="h6" sx={{ mb: 2 }}>Database Size Distribution</Typography>
                           <Box sx={{ height: 250, position: 'relative' }}> 
                               <Doughnut data={doughnutData} options={doughnutOptions} />
                           </Box>
                        </CardContent>
                     </RegularCard>
                 </Grid>
              )}

              {/* Top Tables Card */} 
              {topTables.length > 0 && (
                 <Grid item xs={12} md={4}>
                     <RegularCard>
                       <CardContent>
                          <Typography variant="h6" sx={{ mb: 2 }}>Top Tables by Size</Typography>
                          <List dense sx={{ maxHeight: 260, overflow: 'auto' }}>
                             {topTables.map((table, index) => (
                                <ListItem 
                                   key={`${table.dbId}-${table.tableName}`}
                                   disablePadding
                                   secondaryAction={
                                      <Typography variant="caption" color="text.secondary">{table.sizeFormatted}</Typography>
                                   }
                                >
                                    <ListItemIcon sx={{ minWidth: '30px'}}>
                                       <Typography color="text.secondary">{index + 1}.</Typography>
                                    </ListItemIcon>
                                    <ListItemText 
                                       primary={table.tableName}
                                       secondary={table.dbName}
                                       primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500, noWrap: true }}
                                       secondaryTypographyProps={{ fontSize: '0.75rem' }}
                                    />
                                </ListItem>
                             ))}
                          </List>
                       </CardContent>
                     </RegularCard>
                 </Grid>
              )}

              {/* Activity Feed Card */} 
              {/* Adjust width based on whether other cards in this row are present */}
               <Grid item xs={12} md={(topTables.length > 0 && topDatabasesBySize.length > 0) ? 4 : (topTables.length > 0 || topDatabasesBySize.length > 0 ? 6 : 12)}> 
                 <RegularCard>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>Recent Activity</Typography>
                        {events.length === 0 && !loading && (
                            <Typography color="text.secondary" variant="body2">No recent activity.</Typography>
                        )}
                        <List dense sx={{ maxHeight: 260, overflow: 'auto' }}> 
                            {events.map((event) => (
                                <ListItem key={event.id} disablePadding sx={{ mb: 1}}>
                                    <ListItemIcon sx={{minWidth: '40px'}}>
                                        <Avatar sx={{ bgcolor: 'action.selected', width: 32, height: 32 }}>
                                          {getEventIcon(event.event_type)}
                                        </Avatar>
                                    </ListItemIcon>
                                    <ListItemText 
                                        primary={event.message}
                                        secondary={new Date(event.timestamp).toLocaleString()} 
                                        primaryTypographyProps={{ fontSize: '0.875rem' }} 
                                        secondaryTypographyProps={{ fontSize: '0.75rem' }} 
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </CardContent>
                 </RegularCard>
              </Grid>
          </Grid>
        </>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {databases.map((db) => {
            const dbId = db.id || (db.isSample ? 'sample' : null); // Use 'sample' as ID for mock data
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
                    <Grid item xs={12} md={4} key={dbId}> {/* Use dbId for key */}
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

          {/* Placeholder/Message for real DB health details - shown only when NOT loading */}
          {!isHealthDetailsLoading && Object.keys(detailedHealthInfo).length === 0 && databases.some(db => !db.isSample) && (
            <Grid item xs={12}>
              <Alert severity="info">
                Detailed health information for real databases is not yet implemented.
                {/* TODO: Add logic here to fetch real health data */} 
              </Alert>
            </Grid>
          )}

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
                          Database Size (Current)
                        </Typography>
                        <Typography variant="h6">
                          {currentDbStorageInfo.loading ? <CircularProgress size={20} /> : currentDbStorageInfo.sizeFormatted}
                          {currentDbStorageInfo.error && <Tooltip title={currentDbStorageInfo.error}><ErrorIcon color="error" fontSize="small" sx={{ ml: 1 }} /></Tooltip>}
                        </Typography>
                      </Paper>
                    </Grid>
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
                          {/* Use performanceMetrics state */}
                          {/* Example: Accessing data for a specific DB ID would be needed here */}
                          {performanceMetrics['sample']?.cacheHitRatio?.value ?? 'N/A'} %
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
                          {/* Use performanceMetrics state */}
                          {performanceMetrics['sample']?.deadlocks?.last24h ?? 'N/A'}
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
          {/* Conditional Rendering based on if data exists */}
          {/* Render performance data only if available (e.g., for sample DB) */}
          {/* --- Query Performance Card --- */}
          {/* This card currently only shows mock data for the sample DB */}
           <Grid item xs={12} md={6}>
             <RegularCard>
                 <CardContent>
                   <Typography variant="h6" gutterBottom>
                     Query Performance
                   </Typography>
                   
                   {/* Determine if sample data is available */}
                   {/* Use activeDatabaseId to check if Sample DB is selected, or check if 'sample' key exists in performanceMetrics */}
                   {/* Let's assume 'sample' key in performanceMetrics means sample data is loaded */}
                   {performanceMetrics['sample'] ? (
                     <>
                       <Grid container spacing={3} sx={{ mb: 3 }}>
                         <Grid item xs={6}>
                           <Box sx={{ textAlign: 'center', p: 2 }}>
                             <Typography variant="body2" color="text.secondary">
                               Average Query Time
                             </Typography>
                             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                               <AccessTimeIcon sx={{ color: 'primary.main', mr: 1 }} />
                               <Typography variant="h4">
                                 {performanceMetrics['sample']?.querySpeed?.avg ?? 'N/A'} ms
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
                                 {performanceMetrics['sample']?.querySpeed?.p95 ?? 'N/A'} ms
                               </Typography>
                             </Box>
                           </Box>
                         </Grid>
                       </Grid>
                       
                       <Typography variant="subtitle1" gutterBottom>
                         Slow Queries (Sample Data)
                       </Typography>
                       
                       {(performanceMetrics['sample']?.slowQueries || []).map((query, index) => (
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
                     </>
                     ) : (
                         <Alert severity="info" sx={{ mt: 2 }}>
                             Detailed query performance metrics for real databases are not yet implemented.
                         </Alert>
                     )}
                 </CardContent>
               </RegularCard>
             </Grid>

             {/* --- Transaction & Lock Metrics Card --- */}
             {/* This card shows real data for active DB or mock for sample */}
              <Grid item xs={12} md={6}>
                <RegularCard>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Transaction & Lock Metrics
                    </Typography>
                    
                    {/* Placeholder: Transaction Metrics Grid */}
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Active Transactions
                          </Typography>
                          <Typography variant="h4">
                            {/* Show real data if available, else mock for sample, else N/A */}
                            {(activeDatabaseId && !databases.find(db=>db.id === activeDatabaseId)?.isSample) 
                              ? (currentDbTransactionStats.loading ? <CircularProgress size={24}/> : (currentDbTransactionStats.error ? 'Error' : currentDbTransactionStats.activeTransactions)) 
                              : (performanceMetrics['sample']?.transactionMetrics?.active ?? 'N/A')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Commits/sec
                          </Typography>
                          <Typography variant="h4">
                            {/* Show real data (total) if available, else mock for sample, else N/A */}
                            {/* NOTE: Displaying TOTAL commits, not per/sec yet */}
                            {(activeDatabaseId && !databases.find(db=>db.id === activeDatabaseId)?.isSample)
                              ? (currentDbTransactionStats.loading ? '...' : (currentDbTransactionStats.error ? 'Error' : currentDbTransactionStats.totalCommits))
                              : (performanceMetrics['sample']?.transactionMetrics?.commitsPerSec ?? 'N/A')}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Rollbacks/sec
                          </Typography>
                          <Typography variant="h4">
                            {/* Show real data (total) if available, else mock for sample, else N/A */}
                            {/* NOTE: Displaying TOTAL rollbacks, not per/sec yet */}
                            {(activeDatabaseId && !databases.find(db=>db.id === activeDatabaseId)?.isSample) 
                              ? (currentDbTransactionStats.loading ? '...' : (currentDbTransactionStats.error ? 'Error' : currentDbTransactionStats.totalRollbacks))
                              : (performanceMetrics['sample']?.transactionMetrics?.rollbacksPerSec ?? 'N/A')}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    
                    {/* Placeholder: Lock Contention */}
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
                            // Show mock data for sample, 0 otherwise (real data not implemented)
                            value={performanceMetrics['sample']?.lockContention?.waitTimePercent ?? 0} 
                            sx={{ height: 10, borderRadius: 1 }}
                          />
                        </Box>
                        <Typography variant="body2">
                          {performanceMetrics['sample']?.lockContention?.waitTimePercent ?? 0}%
                        </Typography>
                      </Box>
                    </Paper>
                    
                    {/* Placeholder: Index Usage */}
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
                            {/* Show mock data for sample, N/A otherwise */} 
                            {performanceMetrics['sample']?.indexUsage?.mostUsed ?? 'N/A'}
                          </Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6}>
                        <Paper sx={{ p: 2, bgcolor: 'background.neutral' }}>
                          <Typography variant="body2" color="text.secondary">
                            Unused Indexes
                          </Typography>
                          <Typography variant="h4">
                            {performanceMetrics['sample']?.indexUsage?.unusedCount ?? 'N/A'}
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
              {/* Database Selection Dropdown */} 
              {databases && databases.filter(db => db.id && !db.isSample).length > 0 && ( // Show only if real DBs exist
                 <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                   <InputLabel>Target Database (Optional)</InputLabel>
                   <Select
                      value={activeDatabaseId || ''} // Use activeDatabaseId state
                      onChange={handleActiveDatabaseChange} // Update state on change
                      label="Target Database (Optional)"
                   >
                     {/* Option to select no specific database */}
                     <MenuItem value="">
                       <em>None (General Query)</em>
                     </MenuItem>
                     {/* Filter out sample DB from options */} 
                     {databases.filter(db => db.id && !db.isSample).map((db) => (
                       <MenuItem key={db.id} value={db.id}>
                         {db.name} ({db.engine})
                       </MenuItem>
                     ))}
                   </Select>
                 </FormControl>
              )}

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
                <Card variant="outlined" sx={{ mb: 2, overflow: 'visible' }}> {/* Allow accordion to expand */} 
                  <CardContent>
                    {/* Accordion for Formatted Results (Provider Response & SQL) */}
                    <Accordion sx={{ boxShadow: 'none', '&:before': { display: 'none' }, mb:1 }}>
                      <AccordionSummary 
                        expandIcon={<ExpandMoreIcon />} 
                        aria-controls="panel-ai-details-content" 
                        id="panel-ai-details-header"
                        sx={{ 
                          minHeight: '48px', 
                          '&.Mui-expanded': { minHeight: '48px' },
                          backgroundColor: 'action.hover'
                        }}
                      >
                        <Typography variant="subtitle2" color="primary">
                          AI Interaction Details (Provider: {aiProvider || 'AI'})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body1" gutterBottom component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {aiResponse.formatted_results?.replace(aiResponse.sql, '').replace('Execution Result:\n[]', 'Execution Result: No data returned or non-SELECT query.').trim() || 'No detailed response from provider.'}
                        </Typography>
                        {aiResponse.sql && (
                          <>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{mt:1}}>
                              Generated SQL:
                            </Typography>
                            <Box sx={{ 
                              p: 1, 
                              bgcolor: 'background.paper', 
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'divider',
                              maxHeight: '150px',
                              overflow: 'auto'
                            }}>
                              <Typography variant="body2" component="pre" sx={{ margin: 0 }}>
                                {aiResponse.sql}
                              </Typography>
                            </Box>
                          </>
                        )}
                      </AccordionDetails>
                    </Accordion>
                    
                    {/* Result Data Table - Enhanced Styling */}
                    {aiResponse.success && aiResponse.results && aiResponse.results.length > 0 && (
                      <>
                        <Typography variant="subtitle1" color="text.primary" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                          Query Result Data:
                        </Typography>
                        <TableContainer 
                          component={Paper} 
                          sx={{ 
                            maxHeight: '300px', 
                            border: '2px solid', 
                            borderColor: 'primary.main',
                            borderRadius: '8px', 
                            boxShadow: 3 
                          }}
                        >
                          <Table size="small" stickyHeader>
                            <TableHead>
                              <TableRow>
                                {aiResponse.columns && aiResponse.columns.length > 0 
                                  ? aiResponse.columns.map(col => (
                                      <TableCell 
                                        key={col.name} 
                                        sx={theme => ({ 
                                          fontWeight: 'bold', 
                                          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
                                          color: theme.palette.text.primary
                                        })}
                                      >
                                        {col.name}
                                      </TableCell>
                                    ))
                                  : aiResponse.results && aiResponse.results.length > 0 && Object.keys(aiResponse.results[0]).map(key => (
                                      <TableCell 
                                        key={key} 
                                        sx={theme => ({ 
                                          fontWeight: 'bold', 
                                          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
                                          color: theme.palette.text.primary
                                        })}
                                      >
                                        {key}
                                      </TableCell>
                                  ))}
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {aiResponse.results.map((row, i) => (
                                <TableRow key={i} sx={{ '&:hover': { backgroundColor: 'action.hover' } }}>
                                  {aiResponse.columns && aiResponse.columns.length > 0
                                    ? aiResponse.columns.map(col => (
                                      <TableCell key={`${i}-${col.name}`}>
                                        {typeof row[col.name] === 'object' ? JSON.stringify(row[col.name]) : String(row[col.name])}
                                      </TableCell>
                                    ))
                                    : Object.values(row).map((value, j) => (
                                      <TableCell key={`${i}-${j}`}>
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </TableCell>
                                    ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </>
                    )}
                    {/* Message for no results or failed execution */}
                    {(!aiResponse.success || (aiResponse.results && aiResponse.results.length === 0)) && aiResponse.sql && (
                      <Alert severity={aiResponse.success ? "info" : "warning"} sx={{ mt: 2 }}>
                        {aiResponse.db_message || (aiResponse.success ? "Query executed successfully, but returned no data." : "Query execution failed or returned no data.")}
                      </Alert>
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