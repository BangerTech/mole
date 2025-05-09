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

// Styled components
const RootStyle = styled('div')(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(3)
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

  // Fetch database connections
    const fetchDatabases = async () => {
      setLoading(true);
    setError(null);
      try {
      // Fetch connections using the service (API)
      const connections = await DatabaseService.getDatabaseConnections();
      
      // If API returns an empty array, show the sample database
      if (connections && connections.length > 0) {
         setDatabases(connections); // Assuming API only returns real connections
        } else {
        // API returned no connections, show sample database
          const sampleDatabase = {
          id: '1', // Use a distinct ID for the sample
            name: 'Sample Database',
            engine: 'PostgreSQL',
            host: 'localhost',
            port: 5432,
            database: 'sample_db',
            lastConnected: '2023-05-20',
          isSample: true 
          };
          setDatabases([sampleDatabase]);
        }
        
      } catch (err) {
      // Handle potential errors during fetching
      setError('Failed to load database connections. Please check API connectivity.');
      console.error('Error fetching databases:', err);
      setDatabases([]); // Clear databases on error
      } finally {
        setLoading(false);
      }
    };
    
  useEffect(() => {
    fetchDatabases();
  }, []); // Fetch only on mount

  const handleCreateDatabase = () => {
    navigate('/databases/create');
  };

  const handleDatabaseClick = (id) => {
    // Navigate to details page - no localStorage interaction needed here anymore
    // The DatabaseDetails component will fetch the data itself using the ID.
    // Check if it's the sample database ID
    if (id === '1') { 
      // Navigate to a potentially specific route or handle sample display in DatabaseDetails
      navigate(`/database/id/${id}`);
    } else {
      navigate(`/database/id/${id}`);
    }
  };

  const handleMenuOpen = (event, database) => {
    event.stopPropagation();
    // Don't allow menu actions on the sample database
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
    setLoading(true); // Indicate loading state during deletion
    setDeleteDialogOpen(false); // Close dialog immediately
    
    try {
      // Use the service to delete the connection via API
      await DatabaseService.deleteConnection(idToDelete);
      
      // Refetch the list to show the updated state
      await fetchDatabases(); 
      
    } catch (error) {
      console.error('Error deleting database connection:', error);
      setError(error.message || 'Failed to delete connection. Please try again.');
      setLoading(false); // Stop loading indicator on error
    }
    // setLoading(false) is handled by fetchDatabases finally block
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
    // Refetch the database list from the API
    fetchDatabases();
  };

  // Filter databases based on search query
  const filteredDatabases = databases.filter(db => 
    (!db.isSample || searchQuery === '') && // Show sample only if no search query
    (db.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.engine.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.host?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    db.database.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Sort databases based on selected option
  const sortedDatabases = [...filteredDatabases].sort((a, b) => {
    // Keep sample database always at the end if present
    if (a.isSample) return 1;
    if (b.isSample) return -1;

    switch (sortOption) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'engine':
        return a.engine.localeCompare(b.engine);
      case 'lastConnected':
        // Handle potentially null/undefined dates
        const dateA = a.lastConnected ? new Date(a.lastConnected) : 0;
        const dateB = b.lastConnected ? new Date(b.lastConnected) : 0;
        return dateB - dateA;
      default:
        return 0;
    }
  });

  const getEngineIcon = (engine) => {
    switch (engine.toLowerCase()) {
      case 'postgresql':
        return <PostgreSQLIcon sx={{ color: 'info.main' }} />;
      case 'mysql':
        return <MySQLIcon sx={{ color: 'warning.main' }} />;
      case 'sqlite':
        return <SQLiteIcon sx={{ color: 'success.main' }} />;
      default:
        return <PostgreSQLIcon />;
    }
  };

  // Add button description for sample database
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
              <strong>Last Connected:</strong> {db.lastConnected}
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

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateDatabase}
          sx={{ ml: 'auto' }}
        >
          New Connection
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