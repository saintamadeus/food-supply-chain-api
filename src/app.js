require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

const usersRoutes = require('./modules/users/users.routes');
const locationsRoutes = require('./modules/locations/locations.routes');
const productsRoutes = require('./modules/products/products.routes');
const batchesRoutes = require('./modules/batches/batches.routes');
const shipmentsRoutes = require('./modules/shipments/shipments.routes');
const transactionRoutes = require('./modules/transactions/transactions.routes');


// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes (to be added as you build each module)
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/orders', require('./modules/orders/orders.routes'));
app.use('/api/users', usersRoutes);
app.use('/api/locations', locationsRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/shipments', shipmentsRoutes);
app.use('/api/transactions', transactionRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[ERROR] ${statusCode} - ${message}`);
  
  res.status(statusCode).json({ message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;