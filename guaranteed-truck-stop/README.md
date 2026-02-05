# Guaranteed Truck Stop (GTS) - BETA

A safety-critical logistics platform guaranteeing truck parking along major U.S. corridors.
Drivers reserve guaranteed stops, ops monitors capacity in real-time, and locations manage check-ins.

**Status: BETA** - Functional end-to-end for single corridor (I-95 Northeast). Not for production compliance use.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ /driver   │ │ /ops     │ │ /location│ │ /fleet   │          │
│  │ Dashboard │ │ LiveBoard│ │ Admin    │ │ Overview │          │
│  │ Reserve   │ │ Reassign │ │ Capacity │ │ (R/O)    │          │
│  │ Check-in  │ │ Rescue   │ │ Check-in │ │          │          │
│  │ Cert DL   │ │ Incident │ │ Flag     │ │          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                    Leaflet Map + Tailwind CSS                   │
├─────────────────────────────────────────────────────────────────┤
│                        API (NestJS)                              │
│  ┌────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────┐       │
│  │ Auth   │ │ Allocation │ │ CheckIn  │ │ Certificates│       │
│  │ JWT    │ │ Primary    │ │ Geofence │ │ PDF Export  │       │
│  │ RBAC   │ │ Backup     │ │ Arrive   │ │ Rest Event  │       │
│  │        │ │ Emergency  │ │ Depart   │ │             │       │
│  └────────┘ └────────────┘ └──────────┘ └─────────────┘       │
│  ┌────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────┐       │
│  │ HOS    │ │Reservations│ │ Incidents│ │ Locations   │       │
│  │ Timer  │ │ CRUD       │ │ Create   │ │ Capacity    │       │
│  │ Mock   │ │ Reassign   │ │ Track    │ │ Holdback    │       │
│  │        │ │ Rescue     │ │          │ │             │       │
│  └────────┘ └────────────┘ └──────────┘ └─────────────┘       │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL + Prisma ORM                                         │
│  ┌────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐       │
│  │ Users  │ │Corridors │ │Locations  │ │ Reservations │       │
│  │ Drivers│ │ I-95 NE  │ │ 12 stops  │ │ P/B/E alloc  │       │
│  │ Fleets │ │ GeoJSON  │ │ Capacity  │ │ CheckInEvent │       │
│  │        │ │          │ │ Holdback  │ │ Certificates │       │
│  └────────┘ └──────────┘ └───────────┘ └──────────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- OR: Node.js 20+, PostgreSQL 16+

### Option A: Docker Compose (one command)

```bash
cp .env.example .env
docker-compose up --build
```

Then open:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:4000/api

### Option B: Local Development

```bash
# 1. Start PostgreSQL (or use Docker for just the DB)
docker-compose up postgres -d

# 2. Backend
cd backend
cp ../.env.example .env
# Edit .env: DATABASE_URL=postgresql://gts_user:gts_password@localhost:5433/gts_db
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Demo Logins

| Email | Password | Role | Access |
|-------|----------|------|--------|
| driver1@gts.demo | demo1234 | DRIVER | Reserve stops, check-in/out |
| driver2@gts.demo | demo1234 | DRIVER | Reserve stops, check-in/out |
| driver3@gts.demo | demo1234 | DRIVER | Reserve stops, check-in/out |
| ops@gts.demo | demo1234 | OPS | Live board, reassign, rescue |
| loc1@gts.demo | demo1234 | LOCATION_ADMIN | Manage capacity, check-in drivers |
| loc2@gts.demo | demo1234 | LOCATION_ADMIN | Manage capacity, check-in drivers |
| fleet@gts.demo | demo1234 | FLEET_ADMIN | Read-only fleet overview |

## How to Demo in 10 Minutes

1. **Open** http://localhost:3000 - click "Mike Johnson" (driver) quick login
2. **Reserve a stop**: Select "I-95 Northeast Corridor", optionally pick a preferred stop, click "Reserve Guaranteed Stop"
3. **See allocation**: Note the Primary (blue), Backup (yellow), Emergency (red) locations on the map
4. **Check in**: Click "I've Arrived" (uses location coords as fallback in demo)
5. **Check out**: Click "Departed"
6. **Download certificate**: Click "Download Rest Certificate (PDF)"
7. **Logout**, log in as **ops@gts.demo**
8. **Ops board**: See all reservations, capacity bars, map
9. **Reassign**: Click "Reassign" on any active reservation, pick a target, confirm
10. **Rescue protocol**: Click "Rescue" to auto-reassign to backup/emergency
11. **Logout**, log in as **loc1@gts.demo**
12. **Location admin**: See capacity, adjust holdback, check in driver by code
13. **Flag issue**: Click "Flag Overflow / Issue" to notify ops

## Key API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

### Driver
- `GET /api/hos` - Get HOS countdown
- `POST /api/reservations` - Create reservation (auto-allocates P/B/E)
- `GET /api/reservations/mine` - My reservations
- `POST /api/check-in/driver` - Arrive/depart with geofence
- `POST /api/certificates/generate/:resId` - Generate rest certificate
- `GET /api/certificates/:id/pdf` - Download PDF

### Ops
- `GET /api/reservations` - All reservations (filterable)
- `PUT /api/reservations/:id/reassign` - Reassign to new location
- `PUT /api/reservations/:id/rescue` - Rescue protocol
- `PUT /api/reservations/locations/:id/force-capacity` - Force +1 capacity
- `POST /api/incidents` - Create incident
- `GET /api/incidents` - List all incidents

### Location Admin
- `GET /api/locations/mine` - My managed locations
- `PUT /api/locations/:id/capacity?date=YYYY-MM-DD` - Update capacity
- `POST /api/check-in/location` - Check in by confirmation code
- `GET /api/locations/:id/reservations` - Today's reservations

### Common
- `GET /api/corridors` - List corridors with locations
- `GET /api/locations` - List all locations with capacity

## Seed Data

**Corridor**: I-95 Northeast (Boston to Washington DC)

**12 Locations** (north to south):
1. Patriot Rest Stop (Walpole, MA)
2. Providence Truck Haven (Providence, RI)
3. Connecticut Turnpike Plaza (Madison, CT)
4. Milford Service Area (Milford, CT)
5. Cross Bronx Truck Stop (Bronx, NY)
6. Garden State Rest Area (Woodbridge, NJ)
7. Turnpike Travel Center (Cranbury, NJ)
8. Delaware Valley Truck Port (Bristol, PA)
9. Philly Gateway Stop (Philadelphia, PA)
10. Chesapeake House (Perryville, MD)
11. Baltimore Truck Plaza (Baltimore, MD)
12. Capital Region Rest Stop (Laurel, MD)

## Reliability Model

Every reservation guarantees three location assignments:
- **Primary**: Best-fit location based on preference, capacity, and corridor position
- **Backup**: Next nearest location with available capacity
- **Emergency**: Third option for failover

**Holdback spots**: Each location reserves hidden safety buffer spots that are not sold to drivers but available for ops reassignment.

**Rescue Protocol**: If ETA drift makes arrival illegal or primary becomes unavailable, ops triggers rescue to auto-reassign to backup/emergency with updated window.

## Running Tests

```bash
cd backend

# Unit tests (haversine, geofence validation)
npm test

# E2E tests (requires running DB)
npm run test:e2e
```

Unit tests cover:
- Haversine distance calculation (5 cases)
- Geofence validation (5 cases)

Integration tests cover:
- Login flow
- Full reservation lifecycle (create -> check-in -> check-out)

## Extension Points

| Component | Beta | Production |
|-----------|------|------------|
| HOS Engine | Simple countdown from `hours_remaining` | ELD API integration (KeepTruckin, Samsara) |
| Notifications | Console logger | Twilio SMS + SendGrid email |
| Maps | Leaflet + OSM tiles | MapLibre GL + custom vector tiles |
| Geofence | Haversine point-in-circle | PostGIS spatial queries |
| Auth | JWT + bcrypt | OAuth2 + SSO + 2FA |
| Corridors | Single I-95 seed | Multi-corridor with dynamic route planning |
| Pricing | None | Dynamic pricing + holdback auction |
| ETA | Static from reservation | Live GPS + traffic integration |
| Certificates | Basic PDF | Digitally signed + blockchain-anchored |

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Leaflet
- **Backend**: NestJS + TypeScript + Prisma ORM
- **Database**: PostgreSQL 16
- **Auth**: JWT + role-based (DRIVER / OPS / LOCATION_ADMIN / FLEET_ADMIN)
- **Maps**: Leaflet + OpenStreetMap tiles (no paid keys)
- **PDF**: PDFKit
- **Deployment**: Docker Compose
