/**
 * Event Log Service
 * Provides methods for logging application events to the database.
 */

const { getDbConnection } = require('../models/database');

const eventLogService = {
    /**
     * Adds a new entry to the event log.
     * @param {string} eventType - The type of the event (e.g., 'CONNECTION_CREATED').
     * @param {string} message - A descriptive message for the event.
     * @param {number|null} connectionId - Optional ID of the related database connection.
     * @param {object|null} details - Optional object with additional details (will be stringified).
     * @returns {Promise<void>}
     */
    async addEntry(eventType, message, connectionId = null, details = null) {
        try {
            const db = await getDbConnection();
            await db.run(
                `INSERT INTO event_logs (event_type, message, connection_id, details) 
                 VALUES (?, ?, ?, ?)`, 
                [
                    eventType,
                    message,
                    connectionId,
                    details ? JSON.stringify(details) : null
                ]
            );
            await db.close();
            console.log(`Event logged: ${eventType} - ${message}`);
        } catch (error) {
            console.error('Error logging event:', error);
            // Decide if the error should propagate or just be logged
        }
    },

    /**
     * Retrieves the most recent event log entries.
     * @param {number} limit - The maximum number of entries to retrieve.
     * @returns {Promise<Array<object>>} A promise resolving to an array of log entries.
     */
    async getRecentEntries(limit = 20) {
        try {
            const db = await getDbConnection();
            const logs = await db.all(
                `SELECT id, event_type, timestamp, message, connection_id, details 
                 FROM event_logs 
                 ORDER BY timestamp DESC 
                 LIMIT ?`, 
                [limit]
            );
            await db.close();
            // Parse JSON details if they exist
            return logs.map(log => {
                try {
                    return { ...log, details: log.details ? JSON.parse(log.details) : null };
                } catch (parseError) {
                    console.warn(`Failed to parse details for log ID ${log.id}:`, parseError);
                    return { ...log, details: log.details }; // Return raw string if parsing fails
                }
            });
        } catch (error) {
            console.error('Error retrieving event logs:', error);
            return []; // Return empty array on error
        }
    }
};

module.exports = eventLogService; 