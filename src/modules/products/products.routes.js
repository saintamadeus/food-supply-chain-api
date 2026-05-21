// src/modules/products/products.routes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const productsController = require('./products.controller');

router.post('/', authenticate, authorize('producer'), productsController.createProduct);
router.get('/', authenticate, authorize('admin', 'producer', 'supplier', 'retailer'), productsController.getAllProducts);
router.get('/my', authenticate, authorize('producer'), productsController.getMyProducts);
router.get('/:id', authenticate, productsController.getProductById);
router.put('/:id', authenticate, authorize('producer', 'admin'), productsController.updateProduct);
router.delete('/:id', authenticate, authorize('producer', 'admin'), productsController.deleteProduct);

module.exports = router;