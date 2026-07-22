# IoT Environmental Monitoring Platform

A full-stack IoT system: environmental sensor → ESP32 → MQTT → ingestion service → database → secured REST API → live dashboard with historical charts, statistics, and alerting.

Built over 8 weeks as a two-person capstone project at AURAK for Sohail Smart Solutions. Each member owned a distinct layer with clear git-tracked accountability.

---

## Architecture

```
[ESP32 + DHT22 + Photoresistor]
        │
        ▼ (Wi-Fi)
[MQTT Broker — HiveMQ]
        │
        ▼ (MQTT Subscribe)
[Ingestion API — Node.js + Express]
  ├── MQTT subscriber → stores readings
  ├── Alert engine (threshold evaluation + debounce)
  ├── REST API (Bearer token auth, rate limited)
  └── Command relay (dashboard → device)
        │
        ▼ (SQL — parameterized queries)
[Supabase — PostgreSQL]
  ├── devices
  ├── readings
  ├── alerts (active → acknowledged → resolved)
  └── thresholds
        │
        ▼ (Secured REST API)
[Dashboard — React + Vite + Recharts]
  ├── Live telemetry (MQTT WebSocket)
  ├── Historical charts (CSV export, moving average, min/max markers)
  ├── Statistics panel (avg/min/max, device health)
  ├── Alerts panel (filter by severity/status, ack + resolve actions)
  ├── Device control (mode + sample rate)
  └── Auth (token login, offline detection, retry)
```

---

## Features

- **Live telemetry** — real-time temp/light/mode via MQTT WebSocket
- **Historical charts** — time-series graphs with range filters (1h / 24h / 7d), moving average overlay, min/max reference lines
- **CSV export** — download historical readings as CSV for offline analysis
- **Statistics panel** — avg/max/min temperature and light, total readings count, device health badge
- **Alert lifecycle** — three-state workflow: ACTIVE → ACKNOWLEDGED → RESOLVED with dashboard ack/resolve actions
- **Alert filtering** — filter alerts by severity (critical/warning/info) and status (active/acknowledged/resolved)
- **Multi-device support** — device selector, separate data per device_id
- **API security** — Bearer token authentication on all data endpoints, rate limiting (100 req/min)
- **Input validation** — server-side validation on all POST/PATCH endpoints (device ID format, threshold fields, command params)
- **Remote control** — change device mode and sample rate from the dashboard
- **Error handling** — offline detection, API error banner with retry, loading states
- **Auto-reconnect** — device reconnects to Wi-Fi/MQTT on disconnection
- **Automated tests** — 38 tests (23 frontend Vitest + 15 backend Node.js), all passing

---

## Tech Stack

| Layer           | Technology                              |
|-----------------|-----------------------------------------|
| Firmware        | Arduino C++ (ESP32, Wokwi simulation)   |
| Messaging       | MQTT.js over HiveMQ public broker       |
| Ingestion API   | Node.js + Express + MQTT.js             |
| Database        | Supabase (PostgreSQL) with RLS policies  |
| Dashboard       | React 18 + Vite + Recharts              |
| Auth            | Bearer token (API key in env var)       |
| Testing         | Vitest (frontend), Node.js test runner (backend) |

---

## Repository Structure

```
/
├── firmware/                          # ESP32 device code — owner: Abijith
│   ├── firmware.ino                   # Week 4: Arduino Uno UART version
│   ├── firmware_esp32.ino             # Week 5+: ESP32 Wi-Fi/MQTT version
│   ├── sensor_control.h               # Sensor & control layer
│   ├── telemetry_comms.h              # Telemetry & command layer
│   ├── diagram.json                   # Wokwi wiring (Arduino Uno)
│   └── diagram_esp32.json             # Wokwi wiring (ESP32)
│
├── ingestion-api/                     # MQTT subscriber + REST API + alerts — owner: Abijith
│   ├── src/index.js                    # Express server, MQTT client, alert engine, rate limiter
│   ├── src/test/validation.test.js     # Backend validation tests (15 tests)
│   ├── package.json
│   └── .env.example
│
├── dashboard/                         # Web UI — owner: Seif
│   ├── src/App.jsx                    # Main app (orchestrates hooks + components)
│   ├── src/config.js                  # Centralized config (API base, MQTT, constants)
│   ├── src/hooks/useMqtt.js           # MQTT connection hook
│   ├── src/hooks/useApiData.js        # API data fetching hook (devices, alerts, history)
│   ├── src/lib/api.js                 # API client (GET/POST/PATCH/DELETE with auth)
│   ├── src/lib/stats.js               # Stats computations, moving average, CSV export
│   ├── src/components/LoginScreen.jsx # Token login screen
│   ├── src/components/LiveView.jsx     # Live telemetry, metric cards, device control, log
│   ├── src/components/HistoryView.jsx  # Historical charts, stats, CSV export, moving avg
│   ├── src/components/AlertsView.jsx   # Alert panel with ack/resolve + filtering
│   ├── src/styles.css                  # Dark theme responsive design
│   ├── src/test/                       # 23 Vitest tests (stats, api, config)
│   ├── vitest.config.js
│   └── package.json
│
├── screenshots/                       # Proof screenshots
│   ├── 01-login.png                    # Login screen
│   ├── 02-live-view.png               # Live telemetry dashboard
│   ├── 03-history-charts.png          # Historical charts with data
│   ├── 04-alerts.png                  # Alerts panel with severity badges
│   ├── 05-api-database-proof.png      # API endpoints + database query results
│   └── 06-test-results.png            # 38/38 automated tests passing
│
├── PROTOCOL.md                        # All communication contracts + API docs
├── INTEGRATION.md                     # End-to-end test log (all weeks)
├── CONTRIBUTION.md                    # Individual contribution evidence
├── CAPSTONE.md                        # Capstone reflection
├── LEARNING.md                        # Individual learning notes
└── README.md                          # This file
```

---

## Getting Started

### 1. Database (Supabase)
The Supabase project is pre-provisioned. Tables (`devices`, `readings`, `alerts`, `thresholds`) are created via migration. See `PROTOCOL.md` for schema details and `ingestion-api/.env.example` for required env vars.

### 2. Ingestion API
```bash
cd ingestion-api
cp .env.example .env   # Fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, API_TOKEN
npm install
npm start               # Runs on port 3001 (or PORT env var)
```

### 3. Dashboard
```bash
cd dashboard
npm install
npm run dev             # Runs on port 5173
```
Open http://localhost:5173 and enter the API token (default: `iot-platform-demo-token`).

### 4. Run Tests
```bash
# Frontend tests (23 tests)
cd dashboard && npm test

# Backend tests (15 tests)
cd ingestion-api && npm test
```

### 5. ESP32 Firmware (Wokwi)
1. Go to [wokwi.com](https://wokwi.com/projects/new/esp32)
2. Copy the contents of `firmware/firmware_esp32.ino` into the sketch
3. Copy `firmware/diagram_esp32.json` into the `diagram.json` tab
4. Start simulation — device connects to Wi-Fi and MQTT automatically

---

## Live Deployment

| Component     | Platform         | Status     |
|---------------|------------------|------------|
| Dashboard     | Vercel/Netlify   | Pending    |
| Ingestion API | Render/Railway   | Pending    |
| ESP32 Device  | Wokwi (online)   | Pending    |
| Database      | Supabase         | Provisioned |

---

## Screenshots

| Screenshot                | What it shows                                    |
|---------------------------|--------------------------------------------------|
| `screenshots/01-login.png`            | Token-based login screen                    |
| `screenshots/02-live-view.png`         | Live telemetry, metric cards, device control |
| `screenshots/03-history-charts.png`    | Historical temp/light charts with real data  |
| `screenshots/04-alerts.png`            | Alerts panel with severity + status badges   |
| `screenshots/05-api-database-proof.png` | All API endpoints with real database rows   |
| `screenshots/06-test-results.png`       | 38/38 automated tests passing               |

---

## Team

| Member   | Owned Layer                                          |
|----------|------------------------------------------------------|
| Abijith  | Firmware (sensor/control) + Ingestion API + Alerts   |
| Seif     | Dashboard + Analytics + Auth + Tests + Documentation |

See `CONTRIBUTION.md` for detailed individual contribution evidence with commit links.
