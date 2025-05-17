import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Stack
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import StorageIcon from '@mui/icons-material/Storage';
import PostgreSQLIcon from '@mui/icons-material/Storage'; // Use Storage icon as placeholder for PostgreSQL
import MySQLIcon from '@mui/icons-material/Storage'; // Use Storage icon as placeholder for MySQL

// Styled components
const RootStyle = styled('div')({
  height: '100%',
  padding: '24px'
});

const DatabaseCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: theme.shadows[2],
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8]
  }
}));

// Mock data - replace with real API data
const mockDatabases = [
  { 
    id: 1, 
    name: 'production_db', 
    engine: 'PostgreSQL', 
    host: '192.168.1.100', 
    port: 5432, 
    size: '1.2 GB', 
    tables: 32, 
    lastConnected: '2023-06-10 14:32:12' 
  },
  { 
    id: 2, 
    name: 'testing_db', 
    engine: 'MySQL', 
    host: 'localhost', 
    port: 3306, 
    size: '450 MB', 
    tables: 18, 
    lastConnected: '2023-06-09 10:15:45' 
  },
  { 
    id: 3, 
    name: 'development_db', 
    engine: 'PostgreSQL', 
    host: 'localhost', 
    port: 5432, 
    size: '320 MB', 
    tables: 24, 
    lastConnected: '2023-06-10 09:22:38' 
  },
  { 
    id: 4, 
    name: 'archive_db', 
    engine: 'MySQL', 
    host: '192.168.1.120', 
    port: 3306, 
    size: '2.4 GB', 
    tables: 47, 
    lastConnected: '2023-06-08 16:05:21' 
  },
  { 
    id: 5, 
    name: 'analytics_db', 
    engine: 'PostgreSQL', 
    host: '192.168.1.110', 
    port: 5432, 
    size: '3.7 GB', 
    tables: 56, 
    lastConnected: '2023-06-10 11:47:33' 
  }
];

export default function Databases() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [databases, setDatabases] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setTimeout(() => {
        setDatabases(mockDatabases);
        setLoading(false);
      }, 1000);
    };

    fetchData();
  }, []);

  const handleMenuOpen = (event, database) => {
    setAnchorEl(event.currentTarget);
    setSelectedDatabase(database);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    navigate(`/databases/edit/${selectedDatabase.id}`);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    // Implement delete functionality
    const updatedDatabases = databases.filter(db => db.id !== selectedDatabase.id);
    setDatabases(updatedDatabases);
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleConnect = (database) => {
    navigate(`/databases/${database.id}`);
  };

  const handleCreateDatabase = () => {
    navigate('/databases/create');
  };

  const filteredDatabases = databases.filter(db => 
    db.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    db.engine.toLowerCase().includes(searchTerm.toLowerCase()) ||
    db.host.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getEngineIcon = (engine) => {
    switch(engine) {
      case 'PostgreSQL':
        return <PostgreSQLIcon style={{ color: '#336791' }} />;
      case 'MySQL':
        return <MySQLIcon style={{ color: '#4479A1' }} />;
      default:
        return <StorageIcon />;
    }
  };

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
          Databases
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage and connect to your databases
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          placeholder="Search databases..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={handleCreateDatabase}
        >
          New Database
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ boxShadow: 2, borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.neutral' }}>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Engine</TableCell>
              <TableCell>Host</TableCell>
              <TableCell>Port</TableCell>
              <TableCell align="right">Size</TableCell>
              <TableCell align="right">Tables</TableCell>
              <TableCell>Last Connected</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredDatabases.map((database) => (
              <TableRow 
                key={database.id}
                hover
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {getEngineIcon(database.engine)}
                    <Typography variant="body2" fontWeight={500}>
                      {database.name}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={database.engine} 
                    size="small"
                    sx={{ 
                      bgcolor: database.engine === 'PostgreSQL' ? '#33679115' : '#4479A115',
                      color: database.engine === 'PostgreSQL' ? '#336791' : '#4479A1',
                      fontWeight: 500
                    }} 
                  />
                </TableCell>
                <TableCell>{database.host}</TableCell>
                <TableCell>{database.port}</TableCell>
                <TableCell align="right">{database.size}</TableCell>
                <TableCell align="right">{database.tables}</TableCell>
                <TableCell>{database.lastConnected}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => handleConnect(database)}
                      sx={{ mr: 1 }}
                    >
                      Connect
                    </Button>
                    <IconButton 
                      size="small"
                      onClick={(event) => handleMenuOpen(event, database)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredDatabases.length === 0 && (
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            p: 5 
          }}
        >
          <StorageIcon sx={{ fontSize: 60, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No databases found
          </Typography>
          <Typography variant="body2" color="text.disabled" textAlign="center" sx={{ mb: 3 }}>
            {searchTerm 
              ? `No results matching "${searchTerm}"`
              : "You don't have any databases configured yet"
            }
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateDatabase}
            >
              Create New Database
            </Button>
          )}
        </Box>
      )}

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Database Connection</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the connection to {selectedDatabase?.name}? 
            This will only remove the connection in the app, it will not delete the actual database.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </RootStyle>
  );
} 