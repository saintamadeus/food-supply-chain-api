// modules/shipments/shipments.routes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { createShipment, getShipments, getShipmentById, dispatchShipment, deliverShipment, cancelShipment } = require('./shipments.controller');

router.post('/', authenticate, authorize('supplier', 'distributor', 'admin'), createShipment);
router.get('/', authenticate, authorize('admin', 'warehouse_manager', 'supplier', 'distributor', 'retailer'), getShipments);
router.get('/:id', authenticate, getShipmentById);
router.post('/:id/dispatch', authenticate, authorize('supplier', 'distributor', 'admin'), dispatchShipment);
router.post('/:id/deliver',  authenticate, authorize('warehouse_manager', 'retailer', 'admin'), deliverShipment);
router.post('/:id/cancel',   authenticate, authorize('supplier', 'distributor', 'warehouse_manager', 'retailer', 'admin'), cancelShipment);
module.exports = router;