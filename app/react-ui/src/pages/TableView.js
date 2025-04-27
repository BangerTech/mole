import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Toolbar,
  TextField,
  InputAdornment,
  Chip,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
  useTheme,
  Breadcrumbs,
  Link as MuiLink
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreIcon,
  Home as HomeIcon,
  Storage as DatabaseIcon,
  ViewModule as TableIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

// Dummy Daten für Demo-Zwecke
const generateDummyData = () => {
  const users = ['Max Mustermann', 'Lisa Schmidt', 'Tom Müller', 'Anna Wagner', 'Felix Weber'];
  
  // Spalten erzeugen
  const columns = [
    { id: 'id', name: 'id', type: 'INT', nullable: false, default: 'AUTO_INCREMENT', primary: true },
    { id: 'name', name: 'name', type: 'VARCHAR(255)', nullable: false, default: null, primary: false },
    { id: 'email', name: 'email', type: 'VARCHAR(255)', nullable: true, default: null, primary: false },
    { id: 'created_at', name: 'created_at', type: 'DATETIME', nullable: false, default: 'CURRENT_TIMESTAMP', primary: false },
    { id: 'status', name: 'status', type: 'TINYINT', nullable: false, default: '1', primary: false },
    { id: 'price', name: 'price', type: 'DECIMAL(10,2)', nullable: true, default: null, primary: false },
  ];
  
  // Daten für 50 Zeilen erzeugen
  const rows = [];
  for (let i = 1; i <= 50; i++) {
    const row = {
      id: i,
      name: users[Math.floor(Math.random() * users.length)],
      email: `user${i}@example.com`,
      created_at: `2025-04-${Math.floor(Math.random() * 30) + 1} ${Math.floor(Math.random() * 24)}:${Math.floor(Math.random() * 60)}:${Math.floor(Math.random() * 60)}`,
      status: Math.random() > 0.3 ? 1 : 0,
      price: (Math.random() * 1000).toFixed(2),
    };
    rows.push(row);
  }
  
  return { columns, rows };
};

const TableView = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { dbType, dbName, tableName } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState(null);
  const [columnAnchorEl, setColumnAnchorEl] = useState(null);
  
  // Dummy Daten laden
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  
  useEffect(() => {
    // In einer echten Anwendung würde hier eine API-Anfrage erfolgen
    const dummyData = generateDummyData();
    setTableData(dummyData);
  }, [dbType, dbName, tableName]);
  
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleColumnMenuOpen = (event, column) => {
    setColumnAnchorEl(event.currentTarget);
  };
  
  const handleColumnMenuClose = () => {
    setColumnAnchorEl(null);
  };
  
  // Filtern der Daten anhand des Suchbegriffs
  const filteredRows = tableData.rows.filter(row => {
    return Object.values(row).some(
      value => value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Pagination anwenden
  const paginatedRows = filteredRows.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Breadcrumbs 
        aria-label="breadcrumb" 
        sx={{ mb: 3 }}
        separator="›"
      >
        <MuiLink
          component="button"
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          onClick={() => navigate('/')}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </MuiLink>
        <MuiLink
          component="button"
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          onClick={() => navigate('/databases')}
        >
          <DatabaseIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Databases
        </MuiLink>
        <MuiLink
          component="button"
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center' }}
          color="inherit"
          onClick={() => navigate(`/databases/${dbName}`)}
        >
          {dbName}
        </MuiLink>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <TableIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {tableName || 'users'}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            {tableName || 'users'}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            {filteredRows.length} entries found • {tableData.columns.length} columns
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/databases/${dbName}`)}
            sx={{ 
              borderRadius: 20,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Back to Table List
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => console.log('Neuer Eintrag')}
            sx={{ 
              borderRadius: 20,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            New Entry
          </Button>
        </Box>
      </Box>
      
      <Paper 
        sx={{ 
          width: '100%',
          mb: 2,
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}
      >
        <Toolbar sx={{ px: { sm: 2 }, py: 1 }}>
          <TextField
            placeholder="Search records..."
            variant="outlined"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ 
              mr: 2,
              flex: '1 1 auto',
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: '0.875rem',
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            size="small"
          />
          
          <Tooltip title="Refresh">
            <IconButton onClick={() => console.log('Refresh')}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Filter">
            <IconButton onClick={() => console.log('Filter')}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Export">
            <IconButton onClick={() => console.log('Export')}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="More Options">
            <IconButton onClick={handleMenuOpen}>
              <MoreIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
        
        <TableContainer className="table-container">
          <Table size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                {tableData.columns.map((column) => (
                  <TableCell 
                    key={column.id}
                    sx={{ 
                      position: 'relative',
                      bgcolor: theme.palette.background.default,
                      fontWeight: 600,
                      '&:hover .column-actions': {
                        opacity: 1,
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        {column.name}
                        {column.primary && (
                          <Chip
                            label="PK"
                            size="small"
                            sx={{ 
                              ml: 1, 
                              height: 18, 
                              fontSize: '0.6rem',
                              borderRadius: 1,
                              bgcolor: theme.palette.primary.main + '20',
                              color: theme.palette.primary.main,
                              fontWeight: 'bold'
                            }}
                          />
                        )}
                      </Box>
                      
                      <Box 
                        className="column-actions"
                        sx={{ 
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          display: 'flex'
                        }}
                      >
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleColumnMenuOpen(e, column)}
                          sx={{ p: 0.5 }}
                        >
                          <MoreIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                    
                    <Typography 
                      variant="caption" 
                      display="block" 
                      sx={{ 
                        color: theme.palette.text.secondary,
                        fontWeight: 'normal'
                      }}
                    >
                      {column.type}
                      {column.nullable === false && ' NOT NULL'}
                      {column.default && ` DEFAULT ${column.default}`}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell 
                  align="right"
                  sx={{ 
                    bgcolor: theme.palette.background.default,
                    fontWeight: 600,
                    width: 120
                  }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    '&:hover .row-actions': {
                      opacity: 1
                    }
                  }}
                >
                  {tableData.columns.map((column) => (
                    <TableCell key={column.id}>
                      {column.id === 'status' ? (
                        <Chip
                          label={row[column.id] === 1 ? 'Active' : 'Inactive'}
                          size="small"
                          sx={{ 
                            borderRadius: 1,
                            bgcolor: row[column.id] === 1 ? '#4caf5020' : '#f4433620',
                            color: row[column.id] === 1 ? '#4caf50' : '#f44336',
                            fontWeight: 500
                          }}
                        />
                      ) : (
                        row[column.id]
                      )}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <Box 
                      className="row-actions"
                      sx={{ 
                        opacity: { xs: 1, sm: 0 },
                        transition: 'opacity 0.2s'
                      }}
                    >
                      <Tooltip title="Edit">
                        <IconButton 
                          size="small"
                          onClick={() => console.log('Edit row', row.id)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small"
                          onClick={() => console.log('Delete row', row.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={filteredRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
      </Paper>
      
      {/* Table Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { 
            minWidth: 180,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <Typography variant="body2">Empty</Typography>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Typography variant="body2">Show Structure</Typography>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Typography variant="body2">Rename</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleMenuClose} sx={{ color: theme.palette.error.main }}>
          <Typography variant="body2">Delete Table</Typography>
        </MenuItem>
      </Menu>
      
      {/* Column Menu */}
      <Menu
        anchorEl={columnAnchorEl}
        open={Boolean(columnAnchorEl)}
        onClose={handleColumnMenuClose}
        PaperProps={{
          sx: { 
            minWidth: 180,
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }
        }}
      >
        <MenuItem onClick={handleColumnMenuClose}>
          <Typography variant="body2">Sort: Ascending</Typography>
        </MenuItem>
        <MenuItem onClick={handleColumnMenuClose}>
          <Typography variant="body2">Sort: Descending</Typography>
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem onClick={handleColumnMenuClose}>
          <Typography variant="body2">Edit Column</Typography>
        </MenuItem>
        <MenuItem onClick={handleColumnMenuClose} sx={{ color: theme.palette.error.main }}>
          <Typography variant="body2">Delete Column</Typography>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default TableView; 