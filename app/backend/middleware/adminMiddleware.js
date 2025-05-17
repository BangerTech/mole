const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { User } = require('../models/database'); // Import User model

// JWT secret key (sollte mit dem in authController übereinstimmen)
const JWT_SECRET = process.env.JWT_SECRET || 'mole-secret-key-change-in-production';

// Pfad zur Benutzerdatei
// const usersPath = path.join(__dirname, '../data/users.json'); // No longer needed

/**
 * Holt einen Benutzer anhand seiner ID
 * @param {number} id - Benutzer-ID
 * @returns {Promise<Object|null>} - Benutzerobjekt oder null
 */
const findUserById = async (id) => {
  try {
    // const usersData = fs.readFileSync(usersPath, 'utf8'); // No longer needed
    // const users = JSON.parse(usersData); // No longer needed
    // return users.find(user => user.id === id) || null; // No longer needed
    const user = await User.findByPk(id);
    return user ? user.toJSON() : null; // Return plain JSON object
  } catch (error) {
    console.error('Error finding user by ID from DB:', error);
    return null;
  }
};

/**
 * Admin-Middleware zur Prüfung der Admin-Berechtigung
 * Muss nach der authMiddleware verwendet werden
 * @param {Object} req - Request-Objekt
 * @param {Object} res - Response-Objekt
 * @param {Function} next - Nächste Middleware-Funktion
 */
module.exports = async (req, res, next) => { // Make middleware async
  try {
    // Benutzer-ID sollte von authMiddleware gesetzt worden sein
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }
    
    // Benutzer finden
    const user = await findUserById(userId); // Await the async function
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Prüfen, ob Benutzer Admin ist
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    // Benutzer ist Admin, fahre fort
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during admin check' // More specific error message
    });
  }
}; 