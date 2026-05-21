// src/modules/locations/locations.routes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const locationsController = require('./locations.controller');

router.post('/', authenticate, authorize('admin', 'producer', 'supplier', 'warehouse_manager', 'distributor', 'retailer'), locationsController.createLocation);
router.get('/', authenticate, authorize('admin', 'warehouse_manager', 'supplier'), locationsController.getAllLocations);
router.get('/my', authenticate, locationsController.getMyLocations);
router.get('/:id', authenticate, locationsController.getLocationById);
router.put('/:id', authenticate, locationsController.updateLocation);
router.delete('/:id', authenticate, locationsController.deleteLocation);

module.exports = router;