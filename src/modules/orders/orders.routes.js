const express = require('express');
const ordersController = require('./orders.controller');

const router = express.Router();

// Route to create a new order (Retailer requests a product)
router.post('/', ordersController.createOrder);

// Route for warehouse to get pending orders
router.get('/pending', ordersController.getPendingOrders);

// Route for warehouse to process (approve/reject) an order based on inventory
router.post('/:id/process', ordersController.processOrder);

module.exports = router;
