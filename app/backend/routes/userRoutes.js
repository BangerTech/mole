const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const fs = require('fs');
const path = require('path');

// Pfad zur Benutzerdatei
const usersPath = path.join(__dirname, '../data/users.json');

/**
 * Prüft, ob bereits ein Admin-Benutzer existiert.
 * @returns {boolean}
 */
const adminExists = () => {
  try {
    if (fs.existsSync(usersPath)) {
      const usersData = fs.readFileSync(usersPath, 'utf8');
      const users = JSON.parse(usersData);
      return users.some(user => user.role === 'admin');
    }
  } catch (error) {
    console.error('Error checking for admin user:', error);
    return false; // Im Fehlerfall annehmen, dass kein Admin existiert, um Setup zu ermöglichen
  }
  return false;
};

// Middleware für die createUser-Route
const createUserMiddleware = (req, res, next) => {
  if (adminExists()) {
    // Wenn Admins existieren, Auth und Admin-Rolle prüfen
    authMiddleware(req, res, () => {
      adminMiddleware(req, res, next);
    });
  } else {
    // Wenn kein Admin existiert (initiales Setup), erlaube die Erstellung ohne Auth
    next();
  }
};

// Benutzer-Routen
// POST /api/users (Benutzer erstellen) - Spezielle Middleware für initiales Setup
router.post('/', createUserMiddleware, userController.createUser);

// Alle anderen /api/users Routen mit Auth- und Admin-Middleware schützen
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router; 