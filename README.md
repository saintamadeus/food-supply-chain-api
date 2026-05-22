# Food Supply Chain Tracking System
### Group 17 | Capstone Project

A RESTful API that tracks the movement of food products from producers to consumers across the full supply chain — covering producers, suppliers, warehouses, distributors, and retailers.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** PostgreSQL
- **Authentication:** JWT (Access + Refresh Token pattern)
- **Security:** Helmet, CORS, bcrypt
- **Logging:** Morgan

---

## Setup Instructions

### 1. Clone the repository
```bash
git clone https://github.com/saintamadeus/food-supply-chain-api.git
cd food-supply-chain-api
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your environment file
```bash
cp .env.example .env
```
Open `.env` and fill in your actual values.

### 4. Set up the database
Create a PostgreSQL database, then run the migration files inside `/migrations` in order.

### 5. Start the server
```bash
npm run dev
```
Server runs on `http://localhost:5000`

---

## Environment Variables

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
```

---

## Roles & Permissions

| Role | Key Responsibilities |
|------|---------------------|
| `admin` | Full system access, manage users, flag expired batches |
| `producer` | Create products and batches, mark batches ready for pickup |
| `supplier` | Initiate shipments from farm to warehouse |
| `warehouse_manager` | Confirm batch receipt, approve/reject orders, flag expired batches |
| `distributor` | Dispatch outbound shipments to retailers |
| `retailer` | Place orders, confirm delivery, record sales transactions |

---

## API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register a new user |
| POST | `/api/auth/login` | Public | Login and receive access + refresh tokens |
| POST | `/api/auth/refresh` | Public | Get a new access token using refresh token |
| POST | `/api/auth/logout` | Authenticated | Invalidate refresh token |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin | Get all users |
| GET | `/api/users/:id` | Authenticated | Get user by ID |
| PUT | `/api/users/:id` | Authenticated | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |

### Locations
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/locations` | Authenticated | Create a location |
| GET | `/api/locations` | Authenticated | Get all locations |
| GET | `/api/locations/my` | Authenticated | Get my locations |
| GET | `/api/locations/:id` | Authenticated | Get location by ID |
| PUT | `/api/locations/:id` | Authenticated | Update location |
| DELETE | `/api/locations/:id` | Authenticated | Delete location |

### Products
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/products` | Producer, Admin | Create a product |
| GET | `/api/products` | Authenticated | Get all products |
| GET | `/api/products/my` | Producer | Get my products |
| GET | `/api/products/:id` | Authenticated | Get product by ID |
| PUT | `/api/products/:id` | Producer, Admin | Update product |
| DELETE | `/api/products/:id` | Producer, Admin | Delete product |

### Orders
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/orders` | Retailer, Admin | Place a new order |
| GET | `/api/orders/pending` | Warehouse Manager, Admin | View pending orders |
| POST | `/api/orders/:id/process` | Warehouse Manager, Admin | Approve or reject an order |

### Batches
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/batches` | Producer, Admin | Create a batch |
| GET | `/api/batches` | Admin | Get all batches |
| GET | `/api/batches/mine` | Authenticated | Get my batches |
| GET | `/api/batches/:id` | Authenticated | Get batch by ID |
| POST | `/api/batches/:id/mark-ready` | Producer | Mark batch ready for pickup |
| POST | `/api/batches/:id/mark-stored` | Warehouse Manager, Retailer, Supplier, Admin | Confirm batch stored |
| POST | `/api/batches/:id/mark-expired` | Admin, Warehouse Manager | Flag batch as expired |
| GET | `/api/batches/:id/trail` | Authenticated | Get full audit trail for batch |

### Shipments
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/shipments` | Supplier, Distributor, Admin | Create a shipment |
| GET | `/api/shipments` | Authenticated | Get all shipments |
| GET | `/api/shipments/:id` | Authenticated | Get shipment by ID |
| POST | `/api/shipments/:id/dispatch` | Supplier, Distributor, Admin | Dispatch shipment |
| POST | `/api/shipments/:id/deliver` | Warehouse Manager, Retailer, Admin | Confirm delivery |
| POST | `/api/shipments/:id/cancel` | Admin, Shipment Creator | Cancel shipment |

### Transactions
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/transactions` | Retailer | Record a sale |
| GET | `/api/transactions` | Authenticated | Get all transactions |
| GET | `/api/transactions/:id` | Authenticated | Get transaction by ID |

---

## Supply Chain Flow

Producer creates product → Producer creates batch → Batch marked ready
→ Retailer places order → Warehouse Manager approves order
→ Supplier/Distributor creates shipment → Shipment dispatched
→ Shipment delivered to retailer → Retailer records sale

## Batch Status Flow

created → ready → in_transit → stored → partially_sold → sold
↓
expired (any stage)

## Shipment Status Flow
pending → in_transit → delivered
↓
cancelled (any stage)

## Order Status Flow
pending → approved → (shipment created)
→ unavailable (item not in stock)

---

## API Documentation

[View Postman Documentation](https://oluwatimileyinsamuel2018-4796087.postman.co/workspace/Titus-Samuel's-Workspace~3d394bc1-aa53-4a03-89ac-15f1eb76f3bd/collection/53720939-f652f32a-145d-48ab-8e41-002e638148ca?action=share&source=copy-link&creator=53720939)

---

## Project Structure
src/
├── config/          # Database connection
├── middleware/      # authenticate, authorize
├── modules/
│   ├── auth/
│   ├── users/
│   ├── locations/
│   ├── products/
│   ├── orders/
│   ├── batches/
│   ├── shipments/
│   └── transactions/
└── utils/           # logInventoryEvent
migrations/          # SQL migration files