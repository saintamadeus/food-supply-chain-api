// modules/transactions/transactions.routes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const { createTransaction, getTransactions, getTransactionById } = require('./transactions.controller');

router.post('/', authenticate, authorize('retailer', 'admin'), createTransaction);
router.get('/', authenticate, authorize('retailer', 'admin'), getTransactions);
router.get('/:id', authenticate, authorize('retailer', 'admin'), getTransactionById);

module.exports = router;