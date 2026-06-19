# 🚛 Spotter — Route Planner & ELD Generator

A production-grade full-stack logistics SaaS application that helps truck drivers plan routes and automatically generate FMCSA-compliant Electronic Logging Device (ELD) logs.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start (Docker)](#quick-start-docker)
- [Manual Setup](#manual-setup)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [HOS Engine Logic](#hos-engine-logic)
- [Project Structure](#project-structure)
- [Deployment](#deployment)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗺️ **Route Planning** | Real-time routes via OpenRouteService API with polyline map display |
| ⏱️ **HOS Compliance** | Full FMCSA 70hr/8-day cycle engine with 11hr driving, 14hr duty window, 30min break rules |
| ⛽ **Fuel Stops** | Auto-calculated every 1,000 miles |
| 🛌 **Overnight Stops** | Generated when HOS limits are reached |
| 📋 **ELD Logs** | Multi-day FMCSA-format daily log sheets with visual SVG grid |
| 📄 **PDF Export** | Download individual or all daily log sheets as PDF |
| 📊 **Trip Dashboard** | Distance, driving hours, on-duty hours, cycle remaining |

---

## 🛠 Tech Stack

### Backend
- **Django 5** + **Django REST Framework**
- **PostgreSQL 16**
- **OpenRouteService API** (geocoding + routing)
- **ReportLab** (PDF generation)

### Frontend
- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Tailwind CSS v3** (dark logistics theme)
- **React Leaflet** (interactive maps)
- **TanStack Query** (async state management)
- **Axios** (HTTP client)

---

## ✅ Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **PostgreSQL 16** (or Docker Desktop)
- **OpenRouteService API Key** — free at https://openrouteservice.org/dev/#/signup

---

## 🚀 Quick Start (Docker)

```bash
# 1. Clone the repository
git clone <repo-url>
cd truck

# 2. Create environment file
cp .env.example .env
# Edit .env and add your ORS_API_KEY

# 3. Start all services
docker-compose up -d

# 4. Open the app
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/api
```

---

## 🔧 Manual Setup

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate       # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Run database migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit if needed (default: VITE_API_URL=http://localhost:8000/api)

# Start development server
npm run dev
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `SECRET_KEY` | Django secret key | Required |
| `DEBUG` | Debug mode | `True` |
| `DB_NAME` | PostgreSQL database name | `spotter_db` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `postgres` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `ORS_API_KEY` | OpenRouteService API key | Required for live routes |
| `ALLOWED_HOSTS` | Django allowed hosts | `*` |
| `CORS_ALLOW_ALL_ORIGINS` | Allow all CORS origins | `True` |

> **Note**: If `ORS_API_KEY` is empty, the app will use a realistic mock for Dallas→Houston→Chicago. All other HOS/ELD features work fully without an API key.

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000/api` |

---

## 📡 API Documentation

### `POST /api/trips/calculate`

Calculate a trip with HOS compliance and generate ELD logs.

**Request Body:**
```json
{
  "current_location": "Dallas, TX",
  "pickup_location": "Houston, TX",
  "dropoff_location": "Chicago, IL",
  "current_cycle_used": 45
}
```

**Response:**
```json
{
  "trip_id": "uuid",
  "route": {
    "total_distance_miles": 1312.5,
    "total_driving_hours": 21.8,
    "geometry": [[lat, lon], ...],
    "waypoints": []
  },
  "trip_summary": {
    "total_days": 3,
    "total_fuel_stops": 1,
    "total_break_stops": 2,
    "total_driving_hours": 21.8,
    "total_on_duty_hours": 24.8,
    "remaining_cycle_hours": 0.2,
    "estimated_arrival": "2026-06-21T18:00:00"
  },
  "stops": [...],
  "daily_logs": [...]
}
```

### `GET /api/trips/{trip_id}/pdf`

Download ELD logs as PDF.

**Response:** `application/pdf` file download

---

## 🧮 HOS Engine Logic

The HOS engine implements FMCSA property-carrying driver rules:

```
Constants:
  MAX_DRIVING_HOURS = 11.0 / day
  MAX_DUTY_WINDOW   = 14.0 / day  
  BREAK_AFTER       = 8.0 driving hours → 30 min break
  DAILY_RESET       = 10.0 hours off-duty
  CYCLE_LIMIT       = 70.0 hours / 8 days
  FUEL_INTERVAL     = 1,000 miles
  PICKUP_TIME       = 1.0 hour on-duty
  DELIVERY_TIME     = 1.0 hour on-duty

Algorithm:
  1. Start shift at 08:00 on trip start date
  2. Insert pickup stop at appropriate mileage (1hr on-duty)
  3. Loop until all miles driven:
     a. Calculate drivable miles to nearest limit:
        - 11hr daily driving cap
        - 14hr duty window cap  
        - 8hr continuous driving → 30min break
        - 1000mi → fuel stop
        - End of route
     b. Drive to that limit
     c. Insert appropriate stop event
     d. If daily limits hit → 10hr off-duty reset, advance to next day
  4. Insert dropoff stop (1hr on-duty)
  5. Build per-day DutyEvent lists for ELD logs
```

---

## 📁 Project Structure

```
truck/
├── backend/
│   ├── config/                 # Django configuration
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── hos_engine/             # FMCSA HOS compliance engine
│   │   ├── cycle_calculator.py # 70hr/8-day cycle tracking
│   │   ├── trip_scheduler.py   # Core scheduling algorithm
│   │   ├── eld_generator.py    # ELD log formatting
│   │   └── log_renderer.py     # ReportLab PDF generation
│   ├── trips/                  # Django REST app
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   ├── services/
│   │   └── ors_service.py      # OpenRouteService API client
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ELDLog/         # SVG ELD log sheet renderer
│   │   │   ├── Map/            # React Leaflet map
│   │   │   ├── TripTimeline/   # Horizontal timeline
│   │   │   └── ui/             # Shared UI components
│   │   ├── hooks/              # React Query hooks
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API service layer
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/              # Helpers & formatters
│   ├── Dockerfile
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## 🚢 Deployment

### Google Cloud Run (Recommended)

```bash
# Backend
gcloud run deploy spotter-backend \
  --source ./backend \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ORS_API_KEY=your-key,DATABASE_URL=your-db-url

# Frontend (build first)
cd frontend && npm run build
# Deploy dist/ to Cloud Run or Firebase Hosting
```

### Environment Notes for Production
- Set `DEBUG=False`
- Use a strong random `SECRET_KEY`
- Use Cloud SQL (PostgreSQL) for the database
- Set `ALLOWED_HOSTS` to your actual domain
- Set `CORS_ALLOW_ALL_ORIGINS=False` and configure `CORS_ALLOWED_ORIGINS`

---

## 📄 License

MIT License — See LICENSE file for details.

---

## 🙏 Acknowledgments

- [OpenRouteService](https://openrouteservice.org/) — Route and geocoding data
- [FMCSA Hours of Service Regulations](https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations)
- [ReportLab](https://www.reportlab.com/) — PDF generation
- [React Leaflet](https://react-leaflet.js.org/) — Interactive maps
