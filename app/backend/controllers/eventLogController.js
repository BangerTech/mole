/**
 * Event Log Controller
 * Handles requests related to retrieving event logs.
 */

const eventLogService = require('../services/eventLogService');

/**
 * Get recent event log entries.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRecentEvents = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 20; // Default to 20 entries
        const events = await eventLogService.getRecentEntries(limit);
        res.status(200).json({ success: true, events });
    } catch (error) {
        console.error('Error fetching recent events:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch recent events.', error: error.message });
    }
}; 