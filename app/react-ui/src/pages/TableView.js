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
  // console.log('[TableView] Received params:', { databaseId, tableName }); // Reduce logging

  // State for the actual connection details
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [isSampleDb, setIsSampleDb] = useState(null); // null: loading, true: sample, false: real

  // Server-side data states
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(true); // Start loading true until connection info is fetched
  const [error, setError] = useState(null);
  
  // DataGrid server-side model states
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25, // Default page size
  });
  const [sortModel, setSortModel] = useState([]); // Array of { field, sort } objects

  // 1. Fetch Connection Info first
  useEffect(() => {
    const fetchConnectionDetails = async () => {
      if (!databaseId) return;
      setLoading(true);
      setError(null);
      setIsSampleDb(null); 
      setConnectionInfo(null); 
      // console.log(`[TableView] Fetching connection details for ID: ${databaseId}`); // Reduce logging
      try {
        const conn = await DatabaseService.getConnectionById(databaseId);
        // console.log('[TableView] Fetched connection details:', conn); // Reduce logging
        if (conn) {
          setConnectionInfo(conn);
          setIsSampleDb(conn.isSample || false);
        } else {
          setError(`Database connection with ID ${databaseId} not found.`);
          setIsSampleDb(false); 
        }
      } catch (err) {
        console.error("Error fetching connection details:", err);
        // Special handling: If ID is '1' (or your designated Sample ID) and we get 404, assume it IS the sample DB
        if (databaseId === '1' && err.response?.status === 404) {
           console.log('[TableView] Connection ID 1 not found in backend, assuming Sample DB.');
           setIsSampleDb(true);
           setConnectionInfo({ id: '1', name: 'Sample Database', isSample: true, engine: 'PostgreSQL' }); // Provide mock info
           setError(null); // Clear the 404 error as it's expected for Sample DB
        } else { 
          // For other errors or other IDs, show the error
          setError('Failed to load connection details.');
          setIsSampleDb(false); // Assume not sample on error
        }
      }
      // Loading state will be managed by subsequent effects
    };
    fetchConnectionDetails();
  }, [databaseId]);

  // 2. Fetch Schema based on isSampleDb state
  useEffect(() => {
    if (isSampleDb === null || !tableName) return;

    const fetchSchema = async () => {
      // console.log(`[TableView] fetchSchema running for ID: ${databaseId}, Table: ${tableName}, IsSample: ${isSampleDb}`); // Reduce logging
      setLoading(true);
      setError(null);
      setColumns([]);

      if (isSampleDb) {
        console.log(`[TableView] Loading MOCK schema for Sample DB table: ${tableName}`);
        try {
          const mockStructure = generateMockStructure(tableName);
          const gridColumns = mockStructure.map(col => ({
            field: col.name,
            headerName: col.name,
            type: col.type.toLowerCase().includes('int') ? 'number'
                  : col.type.toLowerCase().includes('time') ? 'dateTime'
                  : col.type.toLowerCase().includes('bool') ? 'boolean' 
                  : 'string',
            width: col.type.toLowerCase().includes('time') ? 180 : 150,
            sortable: true,
            valueGetter: (col.type.toLowerCase().includes('time'))
                         ? (value) => {
                             if (value == null) return null;
                             const date = new Date(value);
                             return isNaN(date.getTime()) ? null : date;
                           }
                         : undefined,
             valueFormatter: (col.type.toLowerCase().includes('time'))
                         ? (value) => {
                              if (value instanceof Date && !isNaN(value)) {
                                return value.toLocaleString();
                              }
                              return '';
                           }
                         : undefined,
             description: `${col.type}${col.nullable ? ' (nullable)' : ''}${col.default ? ` [default: ${col.default}]` : ''}${col.key ? ` (${col.key})` : ''}`
          }));
          setColumns(gridColumns);
        } catch (mockError) {
            console.error("Error generating mock schema:", mockError);
            setError('Failed to generate mock table schema.');
        }
        setLoading(false); // Mock schema loading finished
      } else { // It's a real database
        // console.log(`[TableView] Loading REAL schema for DB ${databaseId} table: ${tableName}`); // Reduce logging
        try {
          const schemaInfo = await DatabaseService.getDatabaseSchema(databaseId);
          // console.log('[TableView] Real schema API response:', schemaInfo); // Reduce logging
          if (schemaInfo.success && schemaInfo.tableColumns && schemaInfo.tableColumns[tableName]) {
            const gridColumns = schemaInfo.tableColumns[tableName].map(col => {
              const columnName = col.name.toLowerCase(); // Use lowercase for comparison
              const columnType = col.type.toLowerCase();
              let gridType = 'string'; // Default type
              let valueGetter;
              let renderCell;
              let width = 150; // Default width
  
              // Specific handling for known numeric columns
              if (columnName === 'uptime' || columnName === 'raw_uptime' || columnName === 'total_kwh') {
                 gridType = 'number'; 
                 width = 120; 
              } 
              // General type detection for other numbers
              else if (columnType.includes('int') || columnType.includes('serial') || columnType.includes('float') || columnType.includes('double') || columnType.includes('decimal') || columnType.includes('numeric')) {
                gridType = 'number';
                width = 100;
                // Add renderCell for simple number-to-string conversion (no locale formatting)
                renderCell = (params) => {
                    if (params.value === null || params.value === undefined) return '';
                    // Use basic toString() for numbers - no thousand separators, dot decimal separator
                    return params.value.toString(); 
                };
              } 
              // Enhanced date/time handling (WORKAROUND: Treat as string)
              else if (columnType.includes('date') || columnType.includes('time')) { 
                // gridType = 'dateTime'; // Original type
                gridType = 'string';    // Treat as string for now
                width = 180;
                valueGetter = undefined; // Remove valueGetter
                // Add renderCell to format the ISO string from backend
                renderCell = (params) => {
                    if (params.value == null) return '';
                    try {
                        return new Date(params.value).toLocaleString(); // Use browser locale default
                    } catch (e) {
                        return params.value; // Fallback to raw string if date parsing fails
                    }
                };
              } else if (columnType.includes('bool')) {
                gridType = 'boolean';
                width = 80;
              } else if (columnType.includes('text') || columnType.includes('varchar')) {
                width = 200;
              }
  
              return {
                field: col.name, 
                headerName: col.name, 
                type: gridType,
                width: width, 
                sortable: true,
                valueGetter: valueGetter, 
                renderCell: renderCell, // Use renderCell for number formatting AND time formatting workaround
                description: `${col.type}${col.nullable ? ' (nullable)' : ''}${col.default ? ` [default: ${col.default}]` : ''}${col.key ? ` (${col.key})` : ''}`
              };
            });
            setColumns(gridColumns);
          } else {
            setError(`Schema for table "${tableName}" not found or failed to load: ${schemaInfo.message || ''}`);
            setColumns([]);
          }
        } catch (err) {
          console.error("Error fetching real schema:", err);
          setError('Failed to load table schema.');
          setColumns([]);
        }
        // Loading state will be set to false by the data fetch useEffect
      }
    };
    fetchSchema();
  }, [databaseId, tableName, isSampleDb]); // Depend on isSampleDb

  // 3. Fetch Data based on isSampleDb and when pagination/sorting changes
  const fetchData = useCallback(async () => {
    if (isSampleDb === null || columns.length === 0 || !tableName) {
      // console.log('[TableView] Skipping data fetch (waiting for sample status or columns).'); // Reduce logging
      if (isSampleDb !== null && tableName) setLoading(false); 
      return;
    }
    
    // console.log(`[TableView] fetchData running for ID: ${databaseId}, Table: ${tableName}, IsSample: ${isSampleDb}`); // Reduce logging
    setLoading(true);
    setError(null);

    if (isSampleDb) {
      console.log(`[TableView] Loading MOCK data for Sample DB table: ${tableName}`);
      try {
          await new Promise(resolve => setTimeout(resolve, 50)); // Simulate network delay
          const mockRows = generateMockDataRows(tableName);
          const mockRowCount = mockRows.length;
          setRows(mockRows);
          setRowCount(mockRowCount);
      } catch (mockError) {
          console.error("Error generating mock data:", mockError);
          setError('Failed to generate mock table data.');
          setRows([]);
          setRowCount(0);
      }
      setLoading(false);
    } else { // Real database
      // console.log(`[TableView] Fetching REAL data for DB ${databaseId} table: ${tableName}`); // Reduce logging
      const queryParams = {
        page: paginationModel.page + 1, 
        limit: paginationModel.pageSize,
        sortBy: sortModel.length > 0 ? sortModel[0].field : null,
        sortOrder: sortModel.length > 0 ? sortModel[0].sort : null,
      };
      try {
        // console.log(`Fetching real table data with params:`, queryParams); // Reduce logging
        const result = await DatabaseService.getTableData(databaseId, tableName, queryParams);
        console.log(`[TableView] Received real data for ${tableName}:`, result); // Keep this log
        if (result.success) {
          if (result.rows && result.rows.length > 0) {
            const firstRow = result.rows[0];
            // Keep these debug logs for data checking
            console.log(`[TableView Debug] First row 'time':`, firstRow.time, typeof firstRow.time);
            console.log(`[TableView Debug] First row 'uptime':`, firstRow.uptime, typeof firstRow.uptime);
            console.log(`[TableView Debug] First row 'raw_uptime':`, firstRow.raw_uptime, typeof firstRow.raw_uptime);
            // if (firstRow.time) { // Reduce logging
            //   const parsedDate = new Date(firstRow.time);
            //   console.log(`[TableView Debug] Parsed 'time':`, parsedDate, 'Valid:', !isNaN(parsedDate.getTime()));
            // }
          }

          const processedRows = result.rows.map((row, index) => ({
            ...row,
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
        console.error("Error fetching real table data:", err);
        setError('An error occurred while fetching data.');
        setRows([]);
        setRowCount(0);
      } finally {
        setLoading(false);
      }
    }
  }, [databaseId, tableName, columns, paginationModel, sortModel, isSampleDb]); // Depend on isSampleDb

  // Trigger data fetch when models change OR isSampleDb/columns change
  useEffect(() => {
    fetchData();
  }, [fetchData]); 

  const handleRefresh = () => {
    // Refetch connection details first, which will trigger schema and data refetch
    const refetchConnectionDetails = async () => {
      if (!databaseId) return;
      setLoading(true);
      setError(null);
      setIsSampleDb(null); 
      setConnectionInfo(null);
      console.log(`[TableView] Refresh: Fetching connection details for ID: ${databaseId}`);
      try {
        const conn = await DatabaseService.getConnectionById(databaseId);
        console.log('[TableView] Refresh: Fetched connection details:', conn);
        if (conn) {
          setConnectionInfo(conn);
          setIsSampleDb(conn.isSample || false); 
        } else {
          setError(`Database connection with ID ${databaseId} not found.`);
          setIsSampleDb(false); 
        }
      } catch (err) {
        console.error("Refresh: Error fetching connection details:", err);
        setError('Failed to reload connection details.');
        setIsSampleDb(false); 
      }
       // Loading will be set to false by subsequent schema/data fetches triggered by state change
    };
    refetchConnectionDetails();
  };

  // Display loading indicator while fetching initial connection info
  if (isSampleDb === null && loading) {
      return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 100px)' }}>
              <CircularProgress />
              <Typography sx={{ ml: 2 }}>Loading connection details...</Typography>
          </Box>
      );
  }

  // Log final columns state before rendering DataGrid
  console.log('[TableView Final Columns State]:', columns);

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
          // Use connectionInfo.id if available, otherwise fallback to databaseId from params
          onClick={() => navigate(`/database/id/${connectionInfo?.id || databaseId}`)} 
        >
          {/* Display connection name if available */}
          {connectionInfo?.name || databaseId} 
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
            onClick={() => navigate(`/database/id/${connectionInfo?.id || databaseId}`)} // Use correct ID
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

      <Paper sx={{ width: '100%', borderRadius: 3, overflow: 'visible' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={rowCount}
          loading={loading}
          pageSizeOptions={[10, 25, 50, 100]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          paginationMode={isSampleDb ? "client" : "server"} // Use client-side pagination for mock data
          sortingMode={isSampleDb ? "client" : "server"} // Use client-side sorting for mock data
          sortModel={sortModel}
          onSortModelChange={setSortModel}
          getRowId={(row) => row.id} 
          disableColumnResize={false}
          disableColumnReorder={false}
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: true, 
              csvOptions: { allColumns: true },
              printOptions: { disableToolbarButton: true } 
            },
          }}
           sx={{ 
             border: 'none',
           }}
        />
      </Paper>
    </Box>
  );
};

export default TableView; 