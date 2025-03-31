# BidPower - Real-Time Auction Platform

BidPower is a microservices-based real-time auction platform that allows users to participate in live auctions, place bids, and process payments.

## Prerequisites

- Git
- Docker and Docker Compose
- Node.js (for local development)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/bright-bassey/bidPower.git
cd bidPower
```

### 2. Environment Setup

Create `.env` files for each service in their respective directories:

#### Auth Service (`backend/auth-service/.env`)

```env
MONGODB_URI=mongodb://mongodb:27017/bidpower
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
PORT=4000
```

#### Room Service (`backend/room-service/.env`)

```env
MONGODB_URI=mongodb://mongodb:27017/bidpower
PORT=4001
NATS_URL=nats://nats:4222
```

#### Bidding Service (`backend/bidding-service/.env`)

```env
MONGODB_URI=mongodb://mongodb:27017/bidpower
PORT=4002
NATS_URL=nats://nats:4222
```

#### Notification Service (`backend/notification-service/.env`)

```env
MONGODB_URI=mongodb://mongodb:27017/bidpower
PORT=4003
NATS_URL=nats://nats:4222
```

#### Invoice Service (`backend/invoice-service/.env`)

```env
MONGODB_URI=mongodb://mongodb:27017/bidpower
PORT=4004
NATS_URL=nats://nats:4222
```

#### Payment Service (`backend/payment-service/.env`)

```env
MONGODB_URI=mongodb://mongodb:27017/bidpower
PORT=4005
NATS_URL=nats://nats:4222
```

#### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:4000
VITE_ROOM_SERVICE_URL=http://localhost:4001
VITE_BIDDING_SERVICE_URL=http://localhost:4002
VITE_NOTIFICATION_SERVICE_URL=http://localhost:4003
VITE_INVOICE_SERVICE_URL=http://localhost:4004
VITE_PAYMENT_SERVICE_URL=http://localhost:4005
```

### 3. Start the Application

Run all services using Docker Compose:

```bash
docker-compose up --build
```

The application will be available at:

- Frontend: http://localhost:3000
- Auth Service: http://localhost:4000
- Room Service: http://localhost:4001
- Bidding Service: http://localhost:4002
- Notification Service: http://localhost:4003
- Invoice Service: http://localhost:4004
- Payment Service: http://localhost:4005
- MongoDB: mongodb://localhost:27017
- NATS: nats://localhost:4222

### 4. Testing the Application

#### Manual Testing

1. Register a new user account
2. Create a new auction room
3. Join an existing auction room
4. Place bids on items
5. Test real-time updates
6. Process payments for won auctions

#### Automated Testing

Each service contains its own test suite. To run tests for a specific service:

1. Navigate to the service directory:

```bash
cd backend/[service-name]
```

2. Install dependencies:

```bash
npm install
```

3. Run tests:

```bash
npm test
```

For frontend tests:

```bash
cd frontend
npm install
npm test
```

#### API Testing

You can use the following endpoints for API testing:

Auth Service (4000):

- POST /api/auth/register - Register new user
- POST /api/auth/login - User login

Room Service (4001):

- GET /api/rooms - List all rooms
- POST /api/rooms - Create new room
- GET /api/rooms/:id - Get room details

Bidding Service (4002):

- POST /api/bids - Place a bid
- GET /api/bids/room/:roomId - Get room bids

Invoice Service (4004):

- GET /api/invoices - Get user invoices
- GET /api/invoices/:id - Get invoice details

Payment Service (4005):

- POST /api/payments - Process payment
- GET /api/payments/invoice/:invoiceId - Get payment history

### 5. Development

For local development without Docker:

1. Start MongoDB and NATS locally
2. Navigate to each service directory and run:

```bash
npm install
npm run dev
```

3. For the frontend:

```bash
cd frontend
npm install
npm run dev
```

### 6. Troubleshooting

- If services fail to start, check if all required ports are available
- Ensure MongoDB is running and accessible
- Check NATS connection in service logs
- Verify all environment variables are properly set

## Architecture

The application follows a microservices architecture with:

- Frontend (React/TypeScript)
- Authentication Service
- Room Service
- Bidding Service
- Notification Service
- Invoice Service
- Payment Service
- MongoDB for data persistence
- NATS for service communication
