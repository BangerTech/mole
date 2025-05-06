import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Tooltip,
  useTheme,
  Breadcrumbs,
  Link as MuiLink,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  Select,
  InputLabel,
  Skeleton,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Home as HomeIcon,
  Storage as DatabaseIcon,
  Refresh as RefreshIcon,
  PostAdd as PostAddIcon,
  Link as LinkIcon,
  CloudOff as CloudOffIcon,
  Dns as DnsIcon,
  AddCircleOutline as AddCircleOutlineIcon
} from '@mui/icons-material';
import databaseService from '../services/DatabaseService';
import { formatBytes } from '../utils/formatUtils';

// Helper to get appropriate icon based on engine type
const getEngineIcon = (engine) => {
  if (!engine) return <DnsIcon />;
  const engineLower = engine.toLowerCase();
  if (engineLower.includes('postgres')) return <img src="/icons/postgres.svg" alt="PostgreSQL" width="24" />;
  if (engineLower.includes('mysql')) return <img src="/icons/mysql.svg" alt="MySQL" width="24" />;
  if (engineLower.includes('sqlite')) return <img src="/icons/sqlite.svg" alt="SQLite" width="24" />;
  if (engineLower.includes('influx')) return <img src="/icons/influxdb.svg" alt="InfluxDB" width="24" />;
  return <DnsIcon />;
};

// Helper to get Avatar background color based on engine
const getEngineColor = (engine) => {
  if (!engine) return '#757575'; // Default grey
  const engineLower = engine.toLowerCase();
  if (engineLower.includes('postgres')) return '#336791';
  if (engineLower.includes('mysql')) return '#4479A1';
  if (engineLower.includes('sqlite')) return '#003B57';
  if (engineLower.includes('influx')) return '#22ADF6';
  return '#757575';
};

const DatabaseList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [databases, setDatabases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

  // Function to fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching database connections...");
      const connections = await databaseService.getDatabaseConnections();
      console.log("Fetched connections:", connections);
      // Check if the response includes the sample database if no real connections exist
      // The backend service should handle returning sample data if needed
      setDatabases(Array.isArray(connections) ? connections : []);
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError(err.message || 'Failed to load database connections.');
      setDatabases([]); // Clear data on error
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleMenuOpen = (event, database) => {
    e.stopPropagation(); // Prevent card click when opening menu
    setAnchorEl(event.currentTarget);
    setSelectedDatabase(database);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDatabase(null);
  };

  const handleEdit = () => {
    if (selectedDatabase) {
      navigate(`/database/edit/${selectedDatabase.id}`);
    }
    handleMenuClose();
  };

  const handleDeleteRequest = () => {
      if (selectedDatabase) {
          setOpenDeleteConfirm(true);
      }
      handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (!selectedDatabase) return;
    setLoading(true); // Indicate loading state during delete
    try {
        await databaseService.deleteConnection(selectedDatabase.id);
        // Refresh the list after deletion
        fetchData();
    } catch (err) {
        console.error('Error deleting connection:', err);
        setError(err.message || 'Failed to delete connection.');
        setLoading(false); // Stop loading on error
    } finally {
        setOpenDeleteConfirm(false);
        setSelectedDatabase(null);
        // Loading will be set to false by fetchData completion
    }
  };

  const handleDeleteCancel = () => {
    setOpenDeleteConfirm(false);
    setSelectedDatabase(null);
  };

  const handleDatabaseClick = (database) => {
    // Navigate to details page for any database ID, including sample
    if (database && database.id) {
        console.log(`Navigating to details for ID: ${database.id}`);
        navigate(`/database/id/${database.id}`);
    } else {
        console.warn("Attempted to navigate with invalid database object:", database);
    }
  };

  // Filter databases based on search term
  const filteredDatabases = databases.filter(database =>
    (database.name && database.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (database.engine && database.engine.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (database.host && database.host.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Group databases by engine type for display
  const groupedDatabases = filteredDatabases.reduce((acc, database) => {
    const type = database.engine || 'Unknown'; // Group by engine
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(database);
    return acc;
  }, {});

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
        separator="›"
      >
        <MuiLink
          component="button"
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', color: 'inherit', cursor: 'pointer' }}
          onClick={() => navigate('/')}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </MuiLink>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <DatabaseIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Databases
        </Typography>
      </Breadcrumbs>

      {/* Header and Add Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight={600}>
          Database Connections
        </Typography>
        <Box sx={{ display: 'flex', gap: 1}}>
             <Button
                variant="outlined"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={fetchData} // Add refresh button
                disabled={loading}
                sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 500 }}
             >
                Refresh
             </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => navigate('/database/new')} // Navigate to the new connection form
              sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 500 }}
            >
              Add Connection
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => navigate('/databases/new')}
              sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 500 }}
            >
              Create Database
            </Button>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search connections by name, engine, or host..."
          variant="outlined"
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: { sm: '50%', md: '40%' }, // Limit width on larger screens
            '& .MuiOutlinedInput-root': { borderRadius: 3 }
          }}
        />
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading connections...</Typography>
        </Box>
      )}

      {/* Error State */}
      {!loading && error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              {error}
          </Alert>
      )}

      {/* Database List Content */}
      {!loading && !error && (
        <>
          {Object.entries(groupedDatabases).map(([engine, typeItems]) => (
            <Box key={engine} sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                sx={{ mb: 2, display: 'flex', alignItems: 'center', color: theme.palette.text.secondary, fontWeight: 600 }}
              >
                {getEngineIcon(engine)} <span style={{ marginLeft: '8px' }}>{engine}</span>
              </Typography>

              <Grid container spacing={3}>
                {typeItems.map((database) => (
                  <Grid item xs={12} sm={6} md={4} key={database.id}>
                    <Card
                      sx={{
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                        },
                        display: 'flex', // Use flexbox for layout
                        flexDirection: 'column', // Stack content vertically
                        height: '100%' // Make cards fill height
                      }}
                      onClick={() => handleDatabaseClick(database)}
                    >
                      <CardContent sx={{ flexGrow: 1 }}> {/* Allow content to grow */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar
                              sx={{
                                bgcolor: getEngineColor(database.engine),
                                width: 40,
                                height: 40,
                                boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                              }}
                            >
                              {getEngineIcon(database.engine)}
                            </Avatar>
                            <Box sx={{ ml: 2 }}>
                              <Tooltip title={database.name} placement="top">
                                  <Typography noWrap variant="h6" component="div" sx={{ fontWeight: 600, maxWidth: '200px' }}> {/* Limit width and wrap */}
                                      {database.name}
                                  </Typography>
                              </Tooltip>
                              <Typography variant="body2" color="textSecondary">
                                {database.host}{database.port ? `:${database.port}` : ''}
                              </Typography>
                            </Box>
                          </Box>

                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, database)} // Pass event here
                            // Prevent card click when opening menu - moved to handleMenuOpen
                          >
                            <MoreIcon />
                          </IconButton>
                        </Box>

                        {/* Display Key Info */}
                        <Box>
                           <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                               <span>Database/Path:</span>
                               <Tooltip title={database.database} placement="top">
                                   <span style={{ fontWeight: 500, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                       {database.database}
                                   </span>
                               </Tooltip>
                           </Typography>
                           <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                               <span>User:</span>
                               <span style={{ fontWeight: 500 }}>{database.username || '-'}</span>
                           </Typography>
                           <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                               <span>SSL:</span>
                               <Chip
                                   label={database.ssl_enabled ? 'Enabled' : 'Disabled'}
                                   size="small"
                                   color={database.ssl_enabled ? 'success' : 'default'}
                                   variant="outlined"
                                   sx={{ height: 'auto', '& .MuiChip-label': { py: '1px', px: '6px' } }}
                                />
                           </Typography>
                           <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                               <span>Created:</span>
                               <span style={{ fontWeight: 500 }}>
                                   {database.created_at ? new Date(database.created_at).toLocaleDateString() : '-'}
                               </span>
                           </Typography>
                           {/* Add Last Connected if available */}
                           {database.last_connected && (
                               <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                   <span>Last Connected:</span>
                                   <span style={{ fontWeight: 500 }}>
                                       {new Date(database.last_connected).toLocaleString()}
                                   </span>
                               </Typography>
                           )}
                        </Box>
                      </CardContent>

                      {/* Actions at the bottom */}
                      <CardActions sx={{ p: 2, mt: 'auto' }}> {/* Push actions to bottom */}
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<LinkIcon />}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handleDatabaseClick(database);
                          }}
                          sx={{ borderRadius: 20, textTransform: 'none', fontWeight: 500 }}
                        >
                          Connect
                        </Button>

                        {/* Maybe add a test connection button later */}
                        {/* <Button
                          size="small"
                          color="secondary"
                          variant="outlined"
                          startIcon={<CloudQueueIcon />} // Placeholder icon
                          onClick={(e) => {
                            e.stopPropagation();
                            // Handle Test Connection action
                          }}
                          sx={{ ml: 1, borderRadius: 20, textTransform: 'none', fontWeight: 500 }}
                        >
                          Test
                        </Button> */}
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}

          {/* No Databases Found Message */}
          {filteredDatabases.length === 0 && (
            <Box
              sx={{ p: 4, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', bgcolor: 'background.paper' }}
            >
              <Typography variant="h6" gutterBottom>
                No Database Connections Found
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                {searchTerm
                  ? `No connections found matching "${searchTerm}".`
                  : 'You haven\'t added any database connections yet.'}
              </Typography>
              {!searchTerm && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/database/new')}
                  sx={{ mt: 2, borderRadius: 20, py: 1, px: 3, textTransform: 'none', fontWeight: 500 }}
                >
                  Add Your First Connection
                </Button>
              )}
            </Box>
          )}
        </>
      )}

      {/* Database Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 180, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }}
      >
         <MenuItem onClick={handleEdit} disabled={!selectedDatabase || selectedDatabase.isSample}> {/* Disable for sample */}
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit">Edit</Typography>
        </MenuItem>
        {/* Add other actions like Test Connection maybe */}
        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleDeleteRequest} sx={{ color: theme.palette.error.main }} disabled={!selectedDatabase || selectedDatabase.isSample}> {/* Disable for sample */}
          <ListItemIcon sx={{ color: 'inherit' }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <Typography variant="inherit">Delete</Typography>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
        <Dialog
            open={openDeleteConfirm}
            onClose={handleDeleteCancel}
            aria-labelledby="alert-dialog-title"
            aria-describedby="alert-dialog-description"
            PaperProps={{ sx: { borderRadius: 3 } }}
        >
            <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
            <DialogContent>
            <DialogContentText id="alert-dialog-description">
                Are you sure you want to delete the connection "{selectedDatabase?.name}"? This action cannot be undone.
            </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={handleDeleteCancel} sx={{ borderRadius: 20, textTransform: 'none' }}>
                    Cancel
                </Button>
                <Button
                    onClick={handleDeleteConfirm}
                    color="error"
                    variant="contained"
                    autoFocus
                    disabled={loading}
                    sx={{ borderRadius: 20, textTransform: 'none' }}
                >
                   {loading ? <CircularProgress size={24} color="inherit" /> : 'Delete'}
                </Button>
            </DialogActions>
        </Dialog>
    </Box>
  );
};

export default DatabaseList; 