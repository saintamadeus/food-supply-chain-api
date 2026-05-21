-- USERS
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'producer', 'supplier', 'warehouse_manager', 'distributor', 'retailer')),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- LOCATIONS
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('farm', 'warehouse', 'supplier_facility', 'retailer_shop')),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- PRODUCTS
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  producer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- BATCHES
CREATE TABLE batches (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  supplier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  quantity NUMERIC(10, 2) NOT NULL,
  unit VARCHAR(20) NOT NULL CHECK (unit IN ('kg', 'litres', 'units')),
  current_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'ready', 'in_transit', 'stored', 'partially_sold', 'sold', 'expired')),
  production_date DATE,
  expiry_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SHIPMENTS
CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  distributor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  source_location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  destination_location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'delivered', 'cancelled')),
  departure_date TIMESTAMP,
  arrival_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SHIPMENT_BATCHES (junction table)
CREATE TABLE shipment_batches (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  quantity_moved NUMERIC(10, 2) NOT NULL,
  notes TEXT
);

-- TRANSACTIONS
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  retailer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  total_amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TRANSACTION_ITEMS
CREATE TABLE transaction_items (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  quantity_sold NUMERIC(10, 2) NOT NULL,
  price_per_unit NUMERIC(10, 2) NOT NULL
);

-- INVENTORY_LOGS
CREATE TABLE inventory_logs (
  id SERIAL PRIMARY KEY,
  batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
  performed_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'received', 'moved', 'sold', 'adjusted', 'expired')),
  quantity_change NUMERIC(10, 2),
  from_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- REFRESH_TOKENS
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ORDERS
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  retailer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  warehouse_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity NUMERIC(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'unavailable', 'shipped', 'delivered')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);