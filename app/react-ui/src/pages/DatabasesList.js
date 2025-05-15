import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatabaseService from '../services/DatabaseService';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Tooltip,
  Divider,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Breadcrumbs,
  Link as MuiLink,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import PostgreSQLIcon from '@mui/icons-material/Storage';
import MySQLIcon from '@mui/icons-material/Storage';
import SQLiteIcon from '@mui/icons-material/Storage';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';
import LinkIcon from '@mui/icons-material/Link';
import StorageIcon from '@mui/icons-material/Storage';

// Styled components
const RootStyle = styled('div')(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(0, 3, 3, 3)
}));

const DatabaseCard = styled(Card)(({ theme, engine }) => {
  let borderColor;
  switch (engine?.toLowerCase()) {
    case 'postgresql':
      borderColor = theme.palette.info.main;
      break;
    case 'mysql':
      borderColor = theme.palette.warning.main;
      break;
    case 'sqlite':
      borderColor = theme.palette.success.main;
      break;
    default:
      borderColor = theme.palette.primary.main;
  }
  
  return {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: `5px solid ${borderColor}`,
    transition: 'transform 0.3s, box-shadow 0.3s',
    '&:hover': {
      transform: 'translateY(-5px)',
      boxShadow: theme.shadows[10],
    }
  };
});

const DatabaseCardContent = styled(CardContent)({
  flexGrow: 1
});

const NoConnectionsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(6),
  textAlign: 'center',
  height: '100%',
  gap: theme.spacing(2)
}));

// Helper functions
const getEngineIcon = (engine) => {
  if (!engine) return <StorageIcon sx={{ color: 'action.active' }} />;
  const engineLower = engine.toLowerCase();
  if (engineLower.includes('postgres')) return <StorageIcon sx={{ color: '#336791' }} />;
  if (engineLower.includes('mysql')) return <StorageIcon sx={{ color: '#4479A1' }} />;
  if (engineLower.includes('sqlite')) return <StorageIcon sx={{ color: '#003B57' }} />;
  if (engineLower.includes('influx')) return <StorageIcon sx={{ color: '#22ADF6' }} />;
  return <StorageIcon sx={{ color: 'action.active' }} />;
};

const getEngineColor = (engine) => {
  if (!engine) return '#757575'; // Default grey
  const engineLower = engine.toLowerCase();
  if (engineLower.includes('postgres')) return '#336791';
  if (engineLower.includes('mysql')) return '#4479A1';
  if (engineLower.includes('sqlite')) return '#003B57';
  if (engineLower.includes('influx')) return '#22ADF6';
  return '#757575';
};

const formatLastConnectedDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}.${month}.${year} - ${hours}:${minutes}:${seconds} Uhr`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Fallback to original string if formatting fails
  }
};

export default function DatabasesList() {
  const navigate = useNavigate();
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sortOption, setSortOption] = useState('name');
  const [sortAnchorEl, setSortAnchorEl] = useState(null);

  const fetchDatabases = async () => {
    setLoading(true);
    setError(null);
    try {
      const connections = await DatabaseService.getDatabaseConnections();
      console.log("[DatabasesList.js] Fetched connections in fetchData (Log E):", connections);
      setDatabases(Array.isArray(connections) ? connections : []);
    } catch (err) {
      console.error('[DatabasesList.js] Error fetching connections:', err);
      setError(err.message || 'Failed to load database connections.');
      setDatabases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[DatabasesList.js] useEffect (for fetchData) is running (Log D)');
    fetchDatabases();
  }, []);

  const handleCreateDatabase = () => {
    navigate('/databases/create');
  };

  const handleDatabaseClick = (id) => {
    if (id === '1') {
      navigate(`/database/id/${id}`);
    } else {
      navigate(`/database/id/${id}`);
    }
  };

  const handleMenuOpen = (event, database) => {
    event.stopPropagation();
    if (database.isSample) return;
    setAnchorEl(event.currentTarget);
    setSelectedDatabase(database);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDatabase(null);
  };

  const handleEditDatabase = (event) => {
    event.stopPropagation();
    if (!selectedDatabase || selectedDatabase.isSample) return;
    navigate(`/databases/edit/${selectedDatabase.id}`);
    handleMenuClose();
  };

  const handleDeleteConfirmOpen = (event) => {
    event.stopPropagation();
    if (!selectedDatabase || selectedDatabase.isSample) return;
    setDeleteDialogOpen(true);
    setAnchorEl(null);
  };

  const handleDeleteDatabase = async () => {
    if (!selectedDatabase || selectedDatabase.isSample) {
      console.error('No real database selected for deletion');
      setDeleteDialogOpen(false);
      return;
    }
    
    const idToDelete = selectedDatabase.id;
    setLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      await DatabaseService.deleteConnection(idToDelete);
      await fetchDatabases();
    } catch (error) {
      console.error('Error deleting database connection:', error);
      setError(error.message || 'Failed to delete connection. Please try again.');
      setLoading(false);
    }
  };

  const handleSortMenuOpen = (event) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortMenuClose = () => {
    setSortAnchorEl(null);
  };

  const handleSortChange = (option) => {
    setSortOption(option);
    handleSortMenuClose();
  };

  const handleRefresh = () => {
    fetchDatabases();
  };

  const filteredDatabases = databases.filter(db => 
    (!db.isSample || searchQuery === '') &&
    (db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.engine.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.host?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.database.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedDatabases = [...filteredDatabases].sort((a, b) => {
    if (a.isSample) return 1;
    if (b.isSample) return -1;

    switch (sortOption) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'engine':
        return a.engine.localeCompare(b.engine);
      case 'lastConnected':
        const dateA = a.last_connected ? new Date(a.last_connected) : 0;
        const dateB = b.last_connected ? new Date(b.last_connected) : 0;
        return dateB - dateA;
      default:
        return 0;
    }
  });

  const renderDatabaseCard = (db) => (
    <Grid item xs={12} sm={6} md={4} key={db.id}>
      <DatabaseCard 
        engine={db.engine} 
        onClick={() => handleDatabaseClick(db.id)}
        sx={{ cursor: 'pointer' }}
      >
        <DatabaseCardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getEngineIcon(db.engine)}
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                {db.name}
                {db.isSample && (
                  <Tooltip title="This is a sample database for demonstration purposes. It will be removed automatically when you add your first real database.">
                    <Typography
                      variant="caption"
                      sx={{
                        ml: 1,
                        bgcolor: 'info.main',
                        color: 'info.contrastText',
                        px: 1,
                        py: 0.3,
                        borderRadius: 1
                      }}
                    >
                      DEMO
                    </Typography>
                  </Tooltip>
                )}
              </Typography>
            </Box>
            <IconButton 
              size="small" 
              onClick={(e) => handleMenuOpen(e, db)}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ my: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Engine:</strong> {db.engine}
            </Typography>
            {db.host && (
              <Typography variant="body2" color="text.secondary" noWrap>
                <strong>Host:</strong> {db.host}:{db.port}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" noWrap>
              <strong>Database:</strong> {db.database}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Last Connected:</strong> {formatLastConnectedDate(db.last_connected)}
            </Typography>
          </Box>
        </DatabaseCardContent>
        {!db.isSample && (
        <CardActions>
          <Button 
            size="small" 
            startIcon={<OpenInNewIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleDatabaseClick(db.id);
            }}
          >
            Connect
          </Button>
        </CardActions>
        )}
      </DatabaseCard>
    </Grid>
  );

  if (loading && databases.length === 0) {
    return (
      <RootStyle>
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <CircularProgress />
        </Box>
      </RootStyle>
    );
  }

  return (
    <RootStyle>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Database Connections
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <TextField
          placeholder="Search databases..."
          variant="outlined"
          size="small"
          fullWidth
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
        
        <Tooltip title="Sort">
          <IconButton onClick={handleSortMenuOpen}>
            <SortIcon />
          </IconButton>
        </Tooltip>
        
        <Menu
          anchorEl={sortAnchorEl}
          open={Boolean(sortAnchorEl)}
          onClose={handleSortMenuClose}
        >
          <MenuItem 
            selected={sortOption === 'name'} 
            onClick={() => handleSortChange('name')}
          >
            Name
          </MenuItem>
          <MenuItem 
            selected={sortOption === 'engine'} 
            onClick={() => handleSortChange('engine')}
          >
            Engine
          </MenuItem>
          <MenuItem 
            selected={sortOption === 'lastConnected'} 
            onClick={() => handleSortChange('lastConnected')}
          >
            Last Connected
          </MenuItem>
        </Menu>
        
        <Tooltip title="Refresh">
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={handleCreateDatabase}
          sx={{ }}
        >
          New Connection
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/databases/new')}
          sx={{ }}
        >
          Create Database
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading && databases.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {sortedDatabases.length > 0 ? (
        <Grid container spacing={3}>
          {sortedDatabases.map(db => renderDatabaseCard(db))}
        </Grid>
      ) : (
        !loading && (
          searchQuery ? (
            <NoConnectionsBox>
              <Typography variant="h6">No database connections found</Typography>
              <Typography variant="body1" color="text.secondary">
                Try adjusting your search query
              </Typography>
              <Button 
                variant="outlined" 
                onClick={() => setSearchQuery('')}
              >
                Clear Search
              </Button>
            </NoConnectionsBox>
          ) : (
            <NoConnectionsBox>
              <Typography variant="h6">No database connections yet</Typography>
              <Typography variant="body1" color="text.secondary">
                Create your first database connection to get started
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={handleCreateDatabase}
              >
                New Connection
              </Button>
            </NoConnectionsBox>
          )
        )
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditDatabase}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit Connection</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDeleteConfirmOpen}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Connection</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Database Connection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the connection to "{selectedDatabase?.name}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteDatabase} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </RootStyle>
  );
} 