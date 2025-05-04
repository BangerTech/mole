import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  FormHelperText,
  Divider
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import DatabaseService from '../services/DatabaseService';

const CREATE_NEW_TARGET_VALUE = "__CREATE_NEW__"; // Constant for special value

const DatabaseSyncTab = ({ databaseId, databaseInfo }) => {
  // State for loading settings
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState(null);
  
  const [isSyncEnabled, setIsSyncEnabled] = useState(false);
  const [syncFrequency, setSyncFrequency] = useState('never'); // Default to 'never'
  const [lastSyncTime, setLastSyncTime] = useState('Never');
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false); // State for PUT request

  // State for manual sync operation
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(null);

  // State for target selection
  const [availableTargets, setAvailableTargets] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState(''); // Store the ID or special value
  const [isLoadingTargets, setIsLoadingTargets] = useState(false);

  // Load initial state from API
  useEffect(() => {
    const loadData = async () => {
      if (!databaseId) return;
      setIsLoadingSettings(true);
      setIsLoadingTargets(true);
      setSettingsError(null);
      setAvailableTargets([]);
      setSelectedTargetId('');

      try {
        // Fetch current settings
        console.log("Loading sync settings via API for", databaseId);
        const fetchedSettings = await DatabaseService.getSyncSettings(databaseId);
        setIsSyncEnabled(fetchedSettings.enabled || false);
        setSyncFrequency(fetchedSettings.schedule || 'never');
        setLastSyncTime(fetchedSettings.last_sync ? new Date(fetchedSettings.last_sync).toLocaleString() : 'Never');
        // Set the currently selected target ID if it exists
        setSelectedTargetId(fetchedSettings.target_connection_id || '');

        // Fetch all connections to populate the target dropdown
        console.log("Fetching available target connections...");
        const allConnections = await DatabaseService.getDatabaseConnections();
        // Filter out the current source database
        const potentialTargets = allConnections.filter(conn => conn.id.toString() !== databaseId.toString());
        setAvailableTargets(potentialTargets);

      } catch (error) {
        console.error("Failed to load sync settings or targets:", error);
        setSettingsError(error.message || 'Could not load synchronization settings or target list.');
      } finally {
        setIsLoadingSettings(false);
        setIsLoadingTargets(false);
      }
    };
    loadData();
  }, [databaseId]);

  const updateSettings = async (newSettings) => {
    if (!databaseId) return;
    // Ensure we are sending the correct value for target ID (or the special string)
    const currentTargetValue = selectedTargetId;
    // Only proceed if enabling with a target OR creating new OR disabling
    if (!newSettings.enabled && currentTargetValue === CREATE_NEW_TARGET_VALUE) {
        console.log("Disabling sync, no need to create target.");
        // If disabling while create new was selected, just send disabled state
         const payload = { enabled: false, schedule: newSettings.schedule, target_connection_id: null };
         // ... proceed with API call below ...
    } else if (newSettings.enabled && !currentTargetValue) {
        setSettingsError("Please select a target database or choose to create a new one.");
        return; // Don't call API if enabled without any target selection
    }

    setIsUpdatingSettings(true);
    setSettingsError(null);
    setSyncSuccess(null); 
    try {
      const payload = { 
        enabled: newSettings.enabled,
        schedule: newSettings.schedule,
        // Send the selected ID or the special string, or null if disabling
        target_connection_id: newSettings.enabled ? currentTargetValue : null 
      };
      console.log("Updating settings with payload:", payload);
      const result = await DatabaseService.updateSyncSettings(databaseId, payload);
      setSyncSuccess(result.message || 'Synchronization settings saved successfully.'); 
      
      // Important: If a new DB was created, the backend should ideally return 
      // the new connection ID. We might need to refresh available targets 
      // and set the selectedTargetId to the new ID here.
      // For now, just show success.
      if (currentTargetValue === CREATE_NEW_TARGET_VALUE && result.newTargetId) {
          console.log("Backend created new target with ID:", result.newTargetId);
          // TODO: Refresh target list and select the new one?
          // setSelectedTargetId(result.newTargetId);
          // loadTargets(); // Need a separate function to reload targets
      }

    } catch (error) {
       console.error("Failed to update sync settings:", error);
       setSettingsError(error.message || 'Could not save synchronization settings.');
    } finally {
        setIsUpdatingSettings(false);
    }
  };

  const handleEnableChange = (event) => {
    const newEnabledState = event.target.checked;
    setIsSyncEnabled(newEnabledState);
    // Update settings immediately
    updateSettings({ enabled: newEnabledState, schedule: syncFrequency });
  };

  const handleFrequencyChange = (event) => {
    const newFrequency = event.target.value;
    setSyncFrequency(newFrequency);
    // Update settings only if enabled and a target is somehow selected (ID or create)
    if (isSyncEnabled && selectedTargetId) { 
        updateSettings({ enabled: isSyncEnabled, schedule: newFrequency });
    }
  };

  const handleTargetChange = (event) => {
      const newTargetValue = event.target.value;
      setSelectedTargetId(newTargetValue);
      // If sync is already enabled, update settings immediately with the new target/option
      if (isSyncEnabled && newTargetValue) {
          setSettingsError(null); 
          updateSettings({ enabled: isSyncEnabled, schedule: syncFrequency }); // Let updateSettings read selectedTargetId
      } else if (isSyncEnabled && !newTargetValue) {
           setSettingsError("Sync is enabled but no target is selected. Settings not saved.");
      }
  };

  const handleManualSync = async () => {
    if (!databaseId) return;
    // Allow manual sync if a target ID is selected OR if create new is selected
    if (!selectedTargetId) {
        setSyncError('Please select a target database or choose "Create New Target Database" before starting a manual sync.');
        return;
    }
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    try {
        // Check if we need the backend to create the target first
        if (selectedTargetId === CREATE_NEW_TARGET_VALUE) {
            console.log("Manual Sync: Requesting target creation first...");
            // Ideally, the trigger endpoint could handle creation, or we need a separate one.
            // For now, let's assume trigger handles it, or fails if target doesn't exist yet.
             // We might need to call updateSettings first to ensure the task is created.
            await updateSettings({ enabled: true, schedule: syncFrequency }); 
            // If updateSettings failed, the error state will be set.
            if (settingsError) {
                 setIsSyncing(false);
                return; // Stop if saving settings failed
            }
        }
        
      // Now trigger the actual sync (backend uses the target ID stored in the task)
      console.log("Triggering sync...");
      const result = await DatabaseService.triggerSync(databaseId);
      setSyncSuccess(result.message || 'Manual synchronization triggered successfully.');
    } catch (error) {
      console.error("Manual sync error:", error);
      setSyncError(error.message || 'Failed to start manual sync.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Render Loading State for Settings
  if (isLoadingSettings || isLoadingTargets) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
        </Box>
    );
  }
  
  // Render Error State for Settings
  if (settingsError && !isUpdatingSettings) { // Don't hide controls if update fails
      return (
          <Box sx={{ p: 3 }}>
              <Alert severity="error">{settingsError}</Alert>
          </Box>
      );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Synchronization Settings</Typography>
      
      {/* Display Last Sync Status */}
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Last Synced: {lastSyncTime}
      </Typography>

      {/* Show indicator while updating settings */}
      {isUpdatingSettings && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3} alignItems="center">
        {/* Enable/Disable Switch */}
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch checked={isSyncEnabled} onChange={handleEnableChange} disabled={isUpdatingSettings}/>}
            label="Enable Automatic Synchronization"
          />
           {isSyncEnabled && !selectedTargetId && (
                <Typography variant="caption" color="error" sx={{ display: 'block', ml: 4 }}>
                    Select a target database to activate synchronization.
                </Typography>
            )}
        </Grid>

        {/* Target Database Dropdown */}
         <Grid item xs={12} sm={6}>
          <FormControl fullWidth required error={isSyncEnabled && !selectedTargetId} disabled={isUpdatingSettings || isLoadingTargets}>
            <InputLabel id="target-database-label">Target Database</InputLabel>
            <Select
              labelId="target-database-label"
              value={selectedTargetId}
              label="Target Database *"
              onChange={handleTargetChange}
            >
              <MenuItem value="">
                  <em>Select Target...</em>
              </MenuItem>
              {/* Add the special option */} 
              <MenuItem value={CREATE_NEW_TARGET_VALUE}>
                  <strong>+ Create New Target Database</strong>
              </MenuItem>
              {/* Divider if needed */}
              {availableTargets.length > 0 && <Divider />} 
              {availableTargets.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.name} ({conn.engine} @ {conn.host || conn.database})
                </MenuItem>
              ))}
            </Select>
             {/* Update helper text */} 
             <FormHelperText>{isSyncEnabled && !selectedTargetId ? "Required: Select or create target" : "Select existing or create a new target DB"}</FormHelperText>
          </FormControl>
        </Grid>

        {/* Sync Frequency Dropdown */}
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth disabled={!isSyncEnabled || isUpdatingSettings}>
            <InputLabel id="sync-frequency-label">Frequency</InputLabel>
            <Select
              labelId="sync-frequency-label"
              value={syncFrequency}
              label="Frequency"
              onChange={handleFrequencyChange}
            >
              <MenuItem value={'never'}>Never (Manual Only)</MenuItem>
              <MenuItem value={'hourly'}>Hourly</MenuItem>
              <MenuItem value={'daily'}>Daily</MenuItem>
              <MenuItem value={'weekly'}>Weekly</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* Manual Sync Button */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Button 
            variant="contained"
            color="primary"
            startIcon={isSyncing ? <CircularProgress size={20} /> : <SyncIcon />}
            onClick={handleManualSync}
            // Disable if syncing, updating, or no target selected (ID or create option)
            disabled={isSyncing || isUpdatingSettings || !selectedTargetId} 
          >
            {isSyncing ? 'Syncing Now...' : 'Sync/Backup Now'}
          </Button>
        </Grid>

        {/* Feedback Messages for manual sync*/}
        {syncError && (
          <Grid item xs={12}>
            <Alert severity="error">{syncError}</Alert>
          </Grid>
        )}
        {syncSuccess && (
          <Grid item xs={12}>
            <Alert severity="success">{syncSuccess}</Alert>
          </Grid>
        )}

      </Grid>
    </Box>
  );
};

export default DatabaseSyncTab; 