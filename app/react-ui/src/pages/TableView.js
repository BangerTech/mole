import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
  Button,
  Tooltip
} from '@mui/material';
import {
  Home as HomeIcon,
  Storage as DatabaseIcon,
  ViewModule as TableIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { DataGrid, GridToolbar } from '@mui/x-data-grid';
import DatabaseService from '../services/DatabaseService';
import { generateMockStructure, generateMockDataRows } from '../utils/mockData'; // Import mock helpers

const TableView = () => {
  const navigate = useNavigate();
  const { id: databaseId, tableName } = useParams();

  // Server-side data states
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // DataGrid server-side model states
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25, // Default page size
  });
  const [sortModel, setSortModel] = useState([]); // Array of { field, sort } objects

  // Fetch columns (schema) on initial load
  useEffect(() => {
    const fetchSchema = async () => {
      if (!databaseId || !tableName) return;
      setLoading(true);
      setError(null);
      
      // --- Handle Sample Database --- 
      if (databaseId === '1') {
        console.log(`Loading mock schema for Sample DB table: ${tableName}`);
        // Pass tableName to the mock function
        const mockStructure = generateMockStructure(tableName); 
        const gridColumns = mockStructure.map(col => ({
            field: col.name, 
            headerName: col.name,
            type: col.type.toLowerCase().includes('int') ? 'number' 
                  : col.type.toLowerCase().includes('time') ? 'dateTime' // Treat TIMESTAMP as dateTime
                  : col.type.toLowerCase().includes('bool') ? 'boolean' 
                  : 'string', 
            width: col.type.toLowerCase().includes('time') ? 180 : 150, 
            sortable: true,
            valueGetter: (col.type.toLowerCase().includes('time')) 
                         ? (value) => { // Add valueGetter for dateTime
                             if (value == null) return null;
                             const date = new Date(value);
                             return isNaN(date.getTime()) ? null : date;
                           }
                         : undefined, 
             valueFormatter: (col.type.toLowerCase().includes('time'))
                         ? (value) => { // Add formatter for dateTime
                              if (value instanceof Date && !isNaN(value)) {
                                return value.toLocaleString(); 
                              }
                              return ''; 
                           }
                         : undefined,
            description: `${col.type}${col.nullable ? ' (nullable)' : ''}${col.default ? ` [default: ${col.default}]` : ''}${col.key ? ` (${col.key})` : ''}`
          }));
        setColumns(gridColumns);
        setLoading(false); // Schema loading done for mock
        return; // Don't proceed to API call
      }

      // --- Handle Real Databases --- 
      try {
        const schemaInfo = await DatabaseService.getDatabaseSchema(databaseId);
        if (schemaInfo.success && schemaInfo.tableColumns && schemaInfo.tableColumns[tableName]) {
          // Map schema columns to DataGrid column definitions
          const gridColumns = schemaInfo.tableColumns[tableName].map(col => {
            const columnType = col.type.toLowerCase();
            let gridType = 'string'; // Default type
            let valueGetter;
            let valueFormatter;

            // Specific handling for known columns like uptime/raw_uptime
            if (col.name === 'uptime' || col.name === 'raw_uptime') {
               gridType = 'number'; // Treat uptime as a number (e.g., seconds)
            } 
            // General type detection
            else if (columnType.includes('int') || columnType.includes('serial') || columnType.includes('float') || columnType.includes('double') || columnType.includes('decimal')) {
              gridType = 'number';
            } else if (columnType.includes('date') || columnType.includes('time')) {
              gridType = 'dateTime';
              valueGetter = (value) => {
                if (value == null) return null;
                const date = new Date(value); 
                return isNaN(date.getTime()) ? null : date;
              };
              valueFormatter = (value) => {
                 if (value instanceof Date && !isNaN(value)) {
                   return value.toLocaleString(); 
                 } 
                 return ''; 
              };
            } else if (columnType.includes('bool')) {
              gridType = 'boolean';
            }

            return {
              field: col.name,
              headerName: col.name,
              type: gridType,
              width: gridType === 'dateTime' ? 180 : (gridType === 'boolean' ? 80 : (gridType === 'number' ? 100 : 150)), // Adjust width
              sortable: true,
              valueGetter: valueGetter,
              valueFormatter: valueFormatter, // Add formatter
              description: `${col.type}${col.nullable ? ' (nullable)' : ''}${col.default ? ` [default: ${col.default}]` : ''}${col.key ? ` (${col.key})` : ''}`
            };
          });
          setColumns(gridColumns);
        } else {
          setError(`Schema for table "${tableName}" not found or failed to load.`);
          setColumns([]);
        }
      } catch (err) {
        console.error("Error fetching schema:", err);
        setError('Failed to load table schema.');
        setColumns([]);
      } 
      // Data fetch useEffect will handle the final loading state
    };
    fetchSchema();
  }, [databaseId, tableName]);

  // Fetch data when pagination or sorting changes OR when columns are loaded for Sample DB
  const fetchData = useCallback(async () => {
    // --- Handle Sample Database --- 
    if (databaseId === '1') {
      console.log(`Loading mock data for Sample DB table: ${tableName}`);
      setLoading(true);
      setError(null);
      await new Promise(resolve => setTimeout(resolve, 100)); 
      // Pass tableName to the mock function
      const mockRows = generateMockDataRows(tableName); 
      const mockRowCount = mockRows.length;
      setRows(mockRows);
      setRowCount(mockRowCount);
      setLoading(false);
      return; // Don't proceed to API call
    }

    // --- Handle Real Databases --- 
    if (!databaseId || !tableName || columns.length === 0) {
       return;
    }

    setLoading(true);
    setError(null);

    const queryParams = {
      page: paginationModel.page + 1, // API likely expects 1-based page index
      limit: paginationModel.pageSize,
      sortBy: sortModel.length > 0 ? sortModel[0].field : null,
      sortOrder: sortModel.length > 0 ? sortModel[0].sort : null,
    };

    try {
      console.log(`Fetching data for table ${tableName}:`, queryParams);
      // We need a new service method for this!
      const result = await DatabaseService.getTableData(databaseId, tableName, queryParams);
      
      if (result.success) {
        // Ensure each row has a unique 'id' field for DataGrid (can use existing PK if available)
        // For now, let's assume the PK is called 'id' or generate a temp one
        const processedRows = result.rows.map((row, index) => ({
          ...row,
          // Use a primary key if returned, otherwise generate a temporary index-based id
          id: row.id ?? `${paginationModel.page}-${index}` 
        }));
        setRows(processedRows);
        setRowCount(result.totalRowCount || 0);
      } else {
        setError(result.message || 'Failed to fetch table data.');
        setRows([]);
        setRowCount(0);
      }
    } catch (err) {
      console.error("Error fetching table data:", err);
      setError('An error occurred while fetching data.');
      setRows([]);
      setRowCount(0);
    } finally {
      setLoading(false);
    }
  }, [databaseId, tableName, columns, paginationModel, sortModel]);

  // Trigger data fetch when models change
  useEffect(() => {
    fetchData();
  }, [fetchData]); // Dependency array includes the memoized fetchData function

  const handleRefresh = () => {
    fetchData(); // Re-run the current fetch
  };

  return (
    <Box sx={{ p: 3 }}>
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
          onClick={() => navigate(`/databases/${databaseId}`)} // Navigate back to DB details
        >
          {databaseId} {/* Maybe fetch DB name later */}
        </MuiLink>
        <Typography sx={{ display: 'flex', alignItems: 'center' }} color="text.primary">
          <TableIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          {tableName}
        </Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          {tableName}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
           <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/database/id/${databaseId}`)} // Corrected navigation path
            sx={{ 
              borderRadius: 20,
              py: 1,
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            Back to Database Details
          </Button>
           <Tooltip title="Refresh Data">
            <Button
                variant="outlined"
                onClick={handleRefresh}
                startIcon={<RefreshIcon />}
                 sx={{ 
                  borderRadius: 20,
                  py: 1,
                  textTransform: 'none',
                  fontWeight: 500
                 }}
                disabled={loading}
              >
                Refresh
              </Button>
          </Tooltip>
          {/* Add buttons for New Entry, Filter, Export later */}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Paper sx={{ height: 650, width: '100%', borderRadius: 3 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={rowCount}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode="server"
          sortingMode="server"
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          // Ensure unique row ID is used - DataGrid expects 'id' by default
          getRowId={(row) => row.id} 
          // Density toggle, filtering, CSV export etc. can be added via Toolbar
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true, // Basic client-side quick filter (can be enhanced)
              csvOptions: { allColumns: true },
              printOptions: { disableToolbarButton: true } 
            },
          }}
          sx={{ 
             border: 'none', // Remove default border
             '& .MuiDataGrid-columnHeaders': { 
               backgroundColor: 'action.hover', // Header background
               fontWeight: 'bold'
             },
             '& .MuiDataGrid-cell': {
                 // Optional: Add styling for cells
             }
          }}
        />
      </Paper>
    </Box>
  );
};

export default TableView; 