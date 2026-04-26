# British Auction RFQ System

A full-stack web application implementing a British Auction-style bidding system for freight RFQs (Request for Quotation). Suppliers compete by submitting bids, and the auction automatically extends when bidding activity occurs close to the closing time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL + Prisma ORM |
| Real-time | Socket.io |
| Auth | JWT (Role-based: Buyer / Supplier) |
| Scheduler | node-cron (runs every 30s) |

---

## Features

- **RFQ Creation** — Buyers create auctions with full British Auction configuration
- **Bid Submission** — Suppliers submit quotes with freight, origin, and destination charges
- **Live Rankings** — Suppliers ranked L1, L2, L3 by total bid price, updated in real-time
- **Auto Extension** — Auction time extends when trigger conditions are met inside the trigger window
- **Three Trigger Types:**
  - Any new bid received in last X minutes
  - Any supplier rank change in last X minutes
  - L1 (lowest bidder) change in last X minutes
- **Forced Close** — Auction never extends beyond the forced close time (hard cap)
- **Activity Log** — Full history of bid submissions and time extensions with reasons
- **Real-time Updates** — Socket.io pushes live bid and extension updates to all connected clients
- **Countdown Timer** — Live timer showing time remaining until auction closes

---

## Project Structure

```
british-auction-rfq/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # DB schema (User, Rfq, Bid, AuctionExtensionLog)
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── authController.js  # Register, Login
│   │   │   ├── rfqController.js   # Create, List, Detail RFQ
│   │   │   └── bidController.js   # Submit bid, get bids, rank recalculation
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── rfqRoutes.js
│   │   │   └── bidRoutes.js
│   │   ├── services/
│   │   │   └── extensionService.js # Core British Auction extension logic
│   │   ├── jobs/
│   │   │   └── auctionCron.js     # Cron job — checks extensions every 30s
│   │   ├── socket/
│   │   │   └── socketHandler.js   # Socket.io room management
│   │   ├── middleware/
│   │   │   └── authMiddleware.js  # JWT verification + role guards
│   │   ├── index.js               # Server entry point
│   │   └── seed.js                # Demo data seeder
│   └── .env
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── AuctionList.jsx    # Lists all RFQs with status and lowest bid
    │   │   ├── AuctionDetail.jsx  # Live bids, rankings, activity log, bid form
    │   │   └── CreateRfq.jsx      # RFQ creation form for buyers
    │   ├── services/
    │   │   └── api.js             # Axios API client
    │   ├── App.jsx
    │   ├── socket.js              # Socket.io client
    │   └── main.jsx
    └── index.html
```

---

## Database Schema

### User
| Field | Type | Description |
|---|---|---|
| id | Int (PK) | Auto-increment |
| name | String | Full name |
| email | String (unique) | Login email |
| password | String | Bcrypt hashed |
| role | Enum | BUYER or SUPPLIER |

### Rfq
| Field | Type | Description |
|---|---|---|
| id | Int (PK) | Auto-increment |
| referenceId | String (unique) | e.g. RFQ-1704067200000 |
| name | String | RFQ title |
| bidStartTime | DateTime | When bidding opens |
| bidCloseTime | DateTime | Current close time (can extend) |
| forcedBidCloseTime | DateTime | Hard cap — never crossed |
| triggerWindowMins | Int | X — minutes before close to monitor |
| extensionDurationMins | Int | Y — minutes added on trigger |
| extensionTrigger | Enum | BID_RECEIVED / ANY_RANK_CHANGE / L1_RANK_CHANGE |
| status | Enum | UPCOMING / ACTIVE / CLOSED / FORCE_CLOSED |
| buyerId | Int (FK) | References User |

### Bid
| Field | Type | Description |
|---|---|---|
| id | Int (PK) | Auto-increment |
| rfqId | Int (FK) | References Rfq |
| supplierId | Int (FK) | References User |
| carrierName | String | Carrier used |
| freightCharges | Float | Freight cost |
| originCharges | Float | Origin handling cost |
| destinationCharges | Float | Destination handling cost |
| totalCharges | Float | Sum of all charges |
| transitTimeDays | Int | Delivery time in days |
| quoteValidity | DateTime | Quote expiry date |
| rank | Int | Current rank (L1 = 1, L2 = 2, ...) |

### AuctionExtensionLog
| Field | Type | Description |
|---|---|---|
| id | Int (PK) | Auto-increment |
| rfqId | Int (FK) | References Rfq |
| previousClose | DateTime | Close time before extension |
| newClose | DateTime | New close time after extension |
| reason | String | Why the extension was triggered |
| triggeredAt | DateTime | When the extension happened |

---

## Setup & Installation

### Prerequisites
- Node.js v18+
- PostgreSQL running locally
- npm

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and update DATABASE_URL with your postgres credentials

# Run database migrations
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate

# Seed demo data
node src/seed.js

# Start backend server
npm run dev
```

Backend runs on `http://localhost:5001`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login and get JWT token |

### RFQ
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/rfq/create | Buyer only | Create new RFQ |
| GET | /api/rfq/list | Any | List all RFQs |
| GET | /api/rfq/:id | Any | Get RFQ details with bids and logs |

### Bid
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | /api/bid/submit | Supplier only | Submit a bid |
| GET | /api/bid/:rfqId | Any | Get all bids for an RFQ |

---

## British Auction Extension Logic

```
Every 30 seconds (cron job):
  For each ACTIVE auction:
    1. Activate UPCOMING auctions whose start time has passed
    2. Force close auctions that exceeded forced close time
    3. Close auctions that passed normal bid close time
    4. If inside trigger window (last X mins before close):
         Check trigger condition:
           a) BID_RECEIVED    → any new bid in window?
           b) ANY_RANK_CHANGE → any bid that shifted rankings?
           c) L1_RANK_CHANGE  → did the cheapest supplier change?
         If triggered:
           newCloseTime = currentClose + Y minutes
           if newCloseTime > forcedClose: cap at forcedClose
           Update DB + log extension + emit socket event
```

---

## Demo Credentials

All demo users have password: `password123`

| Role | Email |
|---|---|
| Buyer | buyer@gocomet.com |
| Supplier 1 | supplier1@logistics.com |
| Supplier 2 | supplier2@logistics.com |
| Supplier 3 | supplier3@logistics.com |

---

## Validation Rules

- Forced Bid Close Time must always be greater than Bid Close Time (enforced on both frontend and backend)
- Auction extensions never exceed the Forced Bid Close Time
- Suppliers cannot bid before auction starts or after it closes
- Only BUYER role can create RFQs
- Only SUPPLIER role can submit bids

---

## Real-time Events (Socket.io)

| Event | Direction | Payload |
|---|---|---|
| join_rfq | Client → Server | rfqId |
| leave_rfq | Client → Server | rfqId |
| bid_update | Server → Client | { rfqId, bids[] } |
| auction_extended | Server → Client | { rfqId, previousClose, newClose, reason } |
| auction_status_change | Server → Client | { rfqId, status, message } |
