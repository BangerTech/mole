/**
 * Sync Controller
 * Handles synchronization settings and triggering.
 */
const { getDbConnection } = require('../models/database'); // Import the function
const axios = require('axios'); // Import axios for internal API calls
const databaseService = require('../services/databaseService'); // Needed to get source connection details
const { decrypt } = require('../utils/encryptionUtil'); // Correct path
// Hypothetical service for database instance creation logic
// const InstanceService = require('../services/InstanceService'); 

// --- Helper Functions (Consider moving to a service/utils file later) ---

// Find a sync task entry based on source connection ID
async function findSyncTaskBySourceId(sourceId) {
  let db;
  try {
    db = await getDbConnection(); // Get connection
    // Use Promise-based db.get from 'sqlite' package
    console.log("[findSyncTaskBySourceId] Executing SELECT query...");
    const row = await db.get(
      'SELECT * FROM sync_tasks WHERE source_connection_id = ?',
      [sourceId]
    );
    console.log("[findSyncTaskBySourceId] Query finished. Row:", row);
    return row; // Returns the task row or undefined
  } catch (error) {
      console.error("[findSyncTaskBySourceId] Database error:", error);
      // Re-throw or handle as appropriate for the controller
      throw new Error(`Database error finding sync task: ${error.message}`);
  } finally {
    if (db) {
      try {
          console.log("[findSyncTaskBySourceId] Closing DB connection...");
          await db.close(); // Ensure connection is closed
          console.log("[findSyncTaskBySourceId] DB connection closed.");
      } catch (closeError) {
          console.error("[findSyncTaskBySourceId] Error closing DB:", closeError);
      }
    }
  }
}

// --- Controller Methods ---

exports.getSyncSettings = async (req, res) => {
  const sourceId = req.params.databaseId;
  try {
    console.log(`[SyncController] Getting settings for source DB ID: ${sourceId}`);
    // findSyncTaskBySourceId now handles its own connection and uses await correctly
    const task = await findSyncTaskBySourceId(sourceId);
    if (task) {
      console.log(`[SyncController] Found sync task:`, task);
      res.json({
        enabled: !!task.enabled, // Convert 1/0 to boolean
        schedule: task.schedule || 'never', // Default if null
        last_sync: task.last_sync, // Keep as string/null
        target_connection_id: task.target_connection_id, // Also return target ID if exists
        // Optional: Add target_connection_id, tables if needed later
      });
    } else {
      console.log(`[SyncController] No sync task found for source DB ID: ${sourceId}. Returning defaults.`);
      // If no task exists, return default disabled settings
      res.json({
        enabled: false,
        schedule: 'never',
        last_sync: null,
        target_connection_id: null
      });
    }
  } catch (error) {
    console.error(`[SyncController] Error getting sync settings for ${sourceId}:`, error);
    res.status(500).json({ message: error.message || 'Failed to retrieve sync settings.' });
  }
};

exports.updateSyncSettings = async (req, res) => {
  const sourceId = req.params.databaseId;
  const { enabled, schedule, target_connection_id } = req.body; 

  // Validate required fields
  if (typeof enabled === 'undefined' || typeof schedule === 'undefined') {
    return res.status(400).json({ message: 'Missing required fields: enabled and schedule.' });
  }
  // If enabling, target must be provided
  if (enabled && !target_connection_id) {
      return res.status(400).json({ message: 'Target database ID or "Create New" option is required when enabling synchronization.' });
  }

  // Basic validation for schedule (could be more robust)
  const validSchedules = ['never', 'hourly', 'daily', 'weekly'];
  if (enabled && schedule !== 'never' && !validSchedules.includes(schedule)) {
     // Could also check for valid cron expressions here later
     // For now, restrict to predefined values
    console.warn(`[SyncController] Received schedule "${schedule}" which is not in the standard list, accepting anyway.`);
  }

  let db;
  try {
    console.log(`[SyncController] Updating settings for source DB ID: ${sourceId}`, { enabled, schedule, target_connection_id });
    // findSyncTaskBySourceId handles its own connection
    const existingTask = await findSyncTaskBySourceId(sourceId);
    const now = new Date().toISOString();
    const enabledValue = enabled ? 1 : 0;
    let targetIdValue = null;
    let newTargetCreated = false; // Flag to indicate if a new target was created

    if (enabled) {
        if (target_connection_id === '__CREATE_NEW__') {
            console.log("[SyncController] Create New Target requested.");
            let sourceConnection = null;
            try {
                sourceConnection = await databaseService.getConnectionById(sourceId);
                if (!sourceConnection) {
                     return res.status(404).json({ message: 'Source database connection not found.' });
                }
            } catch (e) {
                 console.error("[SyncController] Could not fetch source connection details:", e.message);
                 return res.status(500).json({ message: 'Could not retrieve source connection details to create target.' });
            }

            // Define parameters for the new database
            const newDbName = `${sourceConnection.name}_sync_copy_${Date.now()}`.substring(0, 63); // Add timestamp, limit length
            const newEngine = sourceConnection.engine;
            // Assume connection uses same host/port/user/pass as source for simplicity?
            // OR define specific target credentials?
            // For now, let's assume we create it with default user/pass on the same engine/host.
            // The API endpoint /create-instance handles the actual creation on the server.
            const creationPayload = {
                name: newDbName, // This will be the connection name AND the db name created
                engine: newEngine,
                // Use source details as template, but the API uses ENV vars for creation itself
                host: sourceConnection.host, 
                port: sourceConnection.port, 
                username: sourceConnection.username || 'sync_user', // Use a placeholder/derived username
                password: `autogen_${Date.now()}`, // Use an auto-generated placeholder password
                ssl_enabled: sourceConnection.ssl_enabled,
                notes: `Auto-created sync target for ${sourceConnection.name}`
            };
            
            console.log("[SyncController] Calling internal create-instance API with payload:", creationPayload);
            try {
                // Internal API call to the existing endpoint
                // Need to construct the base URL for localhost or use a service discovery method if needed
                const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
                const creationResponse = await axios.post(`${baseUrl}/api/databases/create-instance`, creationPayload);
                
                if (creationResponse.data && creationResponse.data.success && creationResponse.data.connection) {
                    targetIdValue = creationResponse.data.connection.id;
                    newTargetCreated = true; // Set the flag
                    console.log(`[SyncController] Successfully created and saved new target DB connection with ID: ${targetIdValue}`);
                } else {
                    throw new Error(creationResponse.data.message || 'Failed to create database instance via internal API call.');
                }
            } catch (creationError) {
                 console.error("[SyncController] Error calling create-instance API:", creationError.response?.data || creationError.message);
                 const detail = creationError.response?.data?.message || creationError.message;
                 return res.status(500).json({ message: `Failed to automatically create target database: ${detail}` });
            }

        } else if (target_connection_id) {
            targetIdValue = target_connection_id;
        } else {
             // This case should be caught by validation above, but as safety net:
             return res.status(400).json({ message: 'Target database ID is required when enabling synchronization.' });
        }
    } // else (disabled) targetIdValue remains null

    db = await getDbConnection(); // Get connection for update/insert

    if (existingTask) {
      console.log(`[SyncController] Updating existing task ID: ${existingTask.id}`);
      // Use Promise-based db.run from 'sqlite' package
      await db.run(
        'UPDATE sync_tasks SET enabled = ?, schedule = ?, target_connection_id = ?, updated_at = ? WHERE id = ?',
        [enabledValue, schedule, targetIdValue, now, existingTask.id]
      );
      console.log(`[SyncController] Sync task ${existingTask.id} updated.`);
      const responsePayload = { message: 'Sync settings updated successfully.' };
      if (newTargetCreated) {
          responsePayload.newTargetId = targetIdValue;
      }
      res.json(responsePayload);
    } else {
      if (enabled && targetIdValue) {
          const defaultName = `Sync for Connection ${sourceId}`;
          console.log(`[SyncController] Creating new sync task for source DB ID: ${sourceId} targeting ${targetIdValue}`);
          // Use Promise-based db.run from 'sqlite' package
          // The result object contains lastID after INSERT
          const result = await db.run(
            'INSERT INTO sync_tasks (name, source_connection_id, target_connection_id, enabled, schedule, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [defaultName, sourceId, targetIdValue, enabledValue, schedule, now, now]
          );
          const newTaskId = result.lastID;
          console.log(`[SyncController] New sync task created with ID: ${newTaskId}`);
           // If new target was created, return its ID to the frontend
          const responsePayload = { message: 'Sync settings saved successfully (new task created).', taskId: newTaskId };
          if (newTargetCreated) {
              responsePayload.newTargetId = targetIdValue;
          }
          res.status(201).json(responsePayload);
      } else {
          console.log(`[SyncController] No existing task and not creating a new one (disabled or no target).`);
          res.json({ message: 'Sync settings saved (no active task configured).' });
      }
    }
  } catch (error) {
    console.error(`[SyncController] Error updating sync settings for ${sourceId}:`, error);
    res.status(500).json({ message: error.message || 'Failed to update sync settings.' });
  } finally {
    if (db) {
      try {
          console.log("[updateSyncSettings] Closing DB connection...");
          await db.close(); // Ensure connection is closed
          console.log("[updateSyncSettings] DB connection closed.");
      } catch (closeError) {
          console.error("[updateSyncSettings] Error closing DB:", closeError);
      }
    }
  }
};

exports.triggerSync = async (req, res) => {
  const sourceDbId = req.params.databaseId;
  let task = null; // Define task variable in outer scope
  try {
    console.log(`[SyncController] Received trigger request for source DB ID: ${sourceDbId}`);
    // findSyncTaskBySourceId handles its own connection
    task = await findSyncTaskBySourceId(sourceDbId); // Assign to outer scope variable

    if (!task) {
      return res.status(404).json({ message: 'No sync task configured for this database.' });
    }
    if (!task.target_connection_id) {
      return res.status(400).json({ message: 'Sync task exists but has no target database configured.' });
    }
    if (!task.enabled) {
      return res.status(400).json({ message: 'Sync task is disabled. Please enable it first.' });
    }

    console.log(`[SyncController] Found task ID ${task.id} (Source: ${task.source_connection_id}, Target: ${task.target_connection_id}). Fetching connection details...`);

    // Fetch connection details for source and target
    const [sourceConnection, targetConnection] = await Promise.all([
      databaseService.getConnectionById(task.source_connection_id),
      databaseService.getConnectionById(task.target_connection_id)
    ]);

    if (!sourceConnection || !targetConnection) {
        console.error(`[SyncController] Could not find connection details for source (${task.source_connection_id}) or target (${task.target_connection_id}).`);
        return res.status(404).json({ message: 'Could not find connection details for source or target database.' });
    }

    // Decrypt passwords (assuming decrypt function is available)
    const sourcePassword = sourceConnection.encrypted_password ? decrypt(sourceConnection.encrypted_password) : sourceConnection.password;
    const targetPassword = targetConnection.encrypted_password ? decrypt(targetConnection.encrypted_password) : targetConnection.password;

    // Prepare payload for Python service
    const syncPayload = {
      taskId: task.id,
      source: {
          id: sourceConnection.id,
          engine: sourceConnection.engine,
          host: sourceConnection.host,
          port: sourceConnection.port,
          database: sourceConnection.database,
          username: sourceConnection.username,
          password: sourcePassword, // Use decrypted password
          ssl_enabled: sourceConnection.ssl_enabled
      },
      target: {
          id: targetConnection.id,
          engine: targetConnection.engine,
          host: targetConnection.host,
          port: targetConnection.port,
          database: targetConnection.database,
          username: targetConnection.username,
          password: targetPassword, // Use decrypted password
          ssl_enabled: targetConnection.ssl_enabled
      },
      // Include tables to sync (assuming stored as JSON string or comma-separated)
      tables: task.tables ? JSON.parse(task.tables) : null // Parse JSON or handle other formats
    };

    // --- Communicate with the Python db-sync service ---
    try {
      const pythonServiceUrl = process.env.PYTHON_BACKEND_URL || 'http://db-sync:5000';
      // Change endpoint to accept POST with data, not task ID in URL
      const triggerUrl = `${pythonServiceUrl}/trigger_sync`; 
      console.log(`[SyncController] Calling Python sync service trigger endpoint: POST ${triggerUrl}`);

      const triggerResponse = await axios.post(triggerUrl,
        syncPayload, // Send connection details and task info
        { timeout: 15000 } 
      );

      if (triggerResponse.status === 200 || triggerResponse.status === 202) {
        console.log(`[SyncController] Python service responded successfully:`, triggerResponse.data);
        res.json({ message: triggerResponse.data?.message || `Synchronization successfully triggered for task ${task.id}.` });
      } else {
        console.warn(`[SyncController] Python service responded with unexpected status ${triggerResponse.status}:`, triggerResponse.data);
        throw new Error(`Python service responded with status ${triggerResponse.status}`);
      }

    } catch (pythonError) {
      // ... existing error handling ...
       console.error(`[SyncController] Error communicating with Python sync service for task ${task?.id || 'unknown'}:`, pythonError.response?.data || pythonError.message);
       let statusCode = 502;
       let errorMessage = 'Failed to trigger synchronization task due to an upstream service error.';
       if (pythonError.code === 'ECONNREFUSED') {
           statusCode = 503;
           errorMessage = 'Failed to trigger synchronization: Sync service is unavailable.';
       } else if (pythonError.code === 'ETIMEDOUT' || pythonError.message.includes('timeout')) {
            statusCode = 504;
            errorMessage = 'Failed to trigger synchronization: Request to sync service timed out.';
       } else if (pythonError.response) {
            statusCode = pythonError.response.status >= 500 ? 502 : pythonError.response.status;
            errorMessage = `Failed to trigger synchronization task. Upstream service error (${pythonError.response.status}): ${pythonError.response.data?.message || 'Unknown upstream error'}`;
       } else {
            errorMessage = `Failed to trigger synchronization task: ${pythonError.message}`;
       }
        res.status(statusCode).json({
          message: errorMessage,
          error: pythonError.message
        });
    }
    // ----------------------------------------------------------------------------

  } catch (error) {
     // Catch errors from findSyncTaskBySourceId or fetching connections
    console.error(`[SyncController] Error during sync trigger setup for source ${sourceDbId}:`, error);
    res.status(500).json({ message: error.message || 'Internal server error while preparing to trigger sync.' });
  }
}; 