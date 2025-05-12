const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

// JWT secret key (sollte mit dem in authController übereinstimmen)
const JWT_SECRET = process.env.JWT_SECRET || 'mole-secret-key-change-in-production';

// Pfad zur Benutzerdatei
const usersPath = path.join(__dirname, '../data/users.json');

/**
 * Holt einen Benutzer anhand seiner ID
 * @param {number} id - Benutzer-ID
 * @returns {Object|null} - Benutzerobjekt oder null
 */
const findUserById = (id) => {
  try {
    const usersData = fs.readFileSync(usersPath, 'utf8');
    const users = JSON.parse(usersData);
    return users.find(user => user.id === id) || null;
  } catch (error) {
    console.error('Error reading users file:', error);
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
module.exports = (req, res, next) => {
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
    const user = findUserById(userId);
    
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
      message: 'Server error' 
    });
  }
}; 