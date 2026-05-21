// src/modules/users/users.routes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const usersController = require('./users.controller');

// All user management is admin only
router.get('/', authenticate, authorize('admin'), usersController.getAllUsers);
router.get('/:id', authenticate, authorize('admin'), usersController.getUserById);
router.put('/:id', authenticate, authorize('admin'), usersController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), usersController.deleteUser);

module.exports = router;