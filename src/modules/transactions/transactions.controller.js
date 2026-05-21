// modules/transactions/transactions.controller.js
const transactionService = require('./transactions.service');

const createTransaction = async (req, res, next) => {
  try {
    const { location_id, items } = req.body;

    if (!location_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'location_id and at least one item are required' });
    }

    for (const item of items) {
      if (!item.batch_id || !item.quantity_sold || !item.price_per_unit) {
        return res.status(400).json({ error: 'Each item needs batch_id, quantity_sold, and price_per_unit' });
      }
    }

    const transaction = await transactionService.createTransaction({
      retailer_id: req.user.id,
      location_id,
      items,
    });

    res.status(201).json({ message: 'Transaction recorded', transaction });
  } catch (err) {
    next(err);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const transactions = await transactionService.getTransactions(req.user);
    res.json(transactions);
  } catch (err) {
    next(err);
  }
};

const getTransactionById = async (req, res, next) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id, req.user);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    next(err);
  }
};

module.exports = { createTransaction, getTransactions, getTransactionById };