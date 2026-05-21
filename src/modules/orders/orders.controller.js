const ordersService = require('./orders.service');

exports.createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    orderData.retailer_id = req.user.id;
    
    const newOrder = await ordersService.createOrder(orderData);
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating order'
    });
  }
};

exports.getPendingOrders = async (req, res) => {
  try {
    // Possibly filter by warehouse_location_id from req.user
    const orders = await ordersService.getPendingOrders();
    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching pending orders'
    });
  }
};

exports.processOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    // warehouse manager id from req.user
    
    const processedOrder = await ordersService.processOrder(id, action);
    res.status(200).json({
      success: true,
      message: `Order ${action}ed successfully`,
      data: processedOrder
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing order'
    });
  }
};
