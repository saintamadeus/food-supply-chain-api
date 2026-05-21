const express = require('express');
const ordersController = require('./orders.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');

const router = express.Router();

// Route to create a new order (Retailer requests a product)
router.post('/', authenticate, authorize('retailer', 'admin'), ordersController.createOrder);

// Route for warehouse to get pending orders
router.get('/pending', authenticate, authorize('warehouse_manager', 'admin'), ordersController.getPendingOrders);

// Route for warehouse to process (approve/reject) an order based on inventory
router.post('/:id/process', authenticate, authorize('warehouse_manager', 'admin'), ordersController.processOrder);

module.exports = router;
