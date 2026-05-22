const ordersService = require('./orders.service');

const createOrder = async (req, res, next) => {
  try {
    const { warehouse_location_id, product_id, quantity } = req.body;

    if (!product_id || !quantity) {
      return res.status(400).json({ message: 'product_id and quantity are required' });
    }
    if (quantity <= 0) {
      return res.status(400).json({ message: 'quantity must be greater than zero' });
    }

    const orderData = {
      retailer_id: req.user.id,
      warehouse_location_id: warehouse_location_id || null,
      product_id,
      quantity,
    };

    const newOrder = await ordersService.createOrder(orderData);
    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (err) {
    next(err);
  }
};

const getPendingOrders = async (req, res, next) => {
  try {
    const orders = await ordersService.getPendingOrders();
    res.status(200).json({ orders });
  } catch (err) {
    next(err);
  }
};

const processOrder = async (req, res, next) => {
  try {
    const { action } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: "action must be either 'approve' or 'reject'" });
    }

    const order = await ordersService.processOrder(req.params.id, action);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.status(200).json({ message: `Order ${action}d successfully`, order });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getPendingOrders, processOrder };