# CONTRIBUTION — Seif

**Name:** Seif Elwalid Elsenousy Taha
**Role:** Dashboard, Analytics & API Security (Frontend)
**Repository:** https://github.com/Seif-Taha12903478/Sohail

---

## Layer Owned

For this IoT platform, I owned the frontend presentation and client-side security layers across all 8 weeks. My responsibilities included:

- Designing and building the React dashboard with live telemetry, historical charts, and alerts
- Implementing token-based authentication (login screen, Bearer token in Authorization headers)
- Building the historical analytics dashboard with Recharts (time-series, range filters, moving average, min/max markers, CSV export)
- Implementing the live severity-tagged alerts panel with ACTIVE → ACKNOWLEDGED → RESOLVED lifecycle
- Building the statistics panel (avg/min/max temp and light, device health badge)
- Implementing error handling (offline detection, API error banner with retry, loading states)
- Modularizing the frontend into config, hooks, components, and lib modules
- Writing 23 frontend tests (Vitest) and 15 backend tests (Node.js test runner)
- Writing all documentation (README, PROTOCOL, INTEGRATION, CAPSTONE, CONTRIBUTION)

---

## Evidence of Work

### Repository
- **Main repo:** https://github.com/Seif-Taha12903478/Sohail

### Key Commits

| Commit | What it delivered |
|--------|-----------------|
| [`6b4d67c`](https://github.com/Seif-Taha12903478/Sohail/commit/6b4d67c) | Initial commit: full dashboard (App.jsx 340 lines), styles, Vite config, all documentation (README, PROTOCOL, INTEGRATION, CONTRIBUTION, CAPSTONE, LEARNING) |
| [`a072e65`](https://github.com/Seif-Taha12903478/Sohail/commit/a072e65) | Proof screenshots: login, live view, history charts, alerts, API+database proof — verified all features working with real Supabase data |
| [`6764fb1`](https://github.com/Seif-Taha12903478/Sohail/commit/6764fb1) | Major upgrade: modularized frontend (config.js, hooks/useMqtt, hooks/useApiData, components/LoginScreen, LiveView, HistoryView, AlertsView, lib/api, lib/stats), alert lifecycle (ACTIVE/ACKNOWLEDGED/RESOLVED), stats panel, CSV export, moving average, offline detection, retry, rate limiting, input validation, 38 tests |
| [`09359f7`](https://github.com/Seif-Taha12903478/Sohail/commit/09359f7) | Test results screenshot: 38/38 tests passing (23 frontend Vitest + 15 backend Node.js) |

### Screenshots (Visual Walkthrough)

Since a live screen recording requires deployed URLs, I provide an annotated screenshot walkthrough below. Each screenshot corresponds to a feature I built:

| # | Screenshot | What it demonstrates |
|---|------------|----------------------|
| 1 | `screenshots/01-login.png` | Token-based login screen — the auth gate I built. Users must enter the API token to access the dashboard. |
| 2 | `screenshots/02-live-view.png` | Live telemetry dashboard — real-time temp/light/mode metric cards, device control panel (mode buttons + rate input), and live telemetry log table. Data flows from ESP32 → MQTT → ingestion → database → dashboard. |
| 3 | `screenshots/03-history-charts.png` | Historical analytics — temperature and light time-series charts rendered from 120 real readings pulled from Supabase. Shows the "Last Hour / 24h / 7 Days" range buttons I built. |
| 4 | `screenshots/04-alerts.png` | Alerts panel — 2 active CRITICAL alerts with severity badges (red), status badges (Active/Resolved), and the alert history with resolved alerts shown at reduced opacity. This shows the alert lifecycle I designed. |
| 5 | `screenshots/05-api-database-proof.png` | All REST API endpoints with real data — /health (200 OK), /devices (2 rows), /readings (240 rows), /thresholds (4 rules), /alerts (4 alerts with resolved status), and 401 Unauthorized for missing token. Proves the auth middleware I implemented. |
| 6 | `screenshots/06-test-results.png` | 38/38 automated tests passing — 23 Vitest tests (stats computations, API client with mocked fetch, config constants) + 15 Node.js tests (input validation, alert lifecycle, rate limiting, command validation). |

### Frontend Module Structure I Built

```
dashboard/src/
├── config.js                    # Centralized config — no hardcoded URLs
├── hooks/
│   ├── useMqtt.js               # MQTT WebSocket connection + message handling
│   └── useApiData.js            # API data fetching (devices, alerts, thresholds, history)
├── lib/
│   ├── api.js                   # API client (GET/POST/PATCH/DELETE with Bearer auth)
│   └── stats.js                 # Stats computations, moving average, CSV export
├── components/
│   ├── LoginScreen.jsx          # Token login with validation + error display
│   ├── LiveView.jsx             # Metric cards, device control, live telemetry log, stats panel
│   ├── HistoryView.jsx          # Charts with moving average, min/max markers, CSV export
│   └── AlertsView.jsx           # Alert panel with ack/resolve actions + severity/status filters
├── test/
│   ├── stats.test.js             # 9 tests (computeStats, movingAverage, exportToCsv)
│   ├── api.test.js               # 7 tests (apiGet, apiPost, apiPatch, apiDelete, ApiError)
│   └── config.test.js            # 7 tests (config, TIME_RANGES, MODE_NAMES, formatters)
└── App.jsx                      # Orchestrator — ties hooks + components together
```

---

## Individual Walkthrough

The screenshots above serve as an annotated walkthrough of the parts I built:

1. **Login** (`01-login.png`): I built the token login screen. The user enters the API token; the frontend validates it by calling `GET /devices` with the Bearer header. On 401, it shows an error. On success, it stores the token in localStorage and loads the dashboard.

2. **Live View** (`02-live-view.png`): I built the live telemetry view — metric cards showing current temp/light/mode, a device control panel for changing mode and sample rate (sends MQTT commands via the API), and a live telemetry log table that updates in real time as MQTT messages arrive.

3. **History & Charts** (`03-history-charts.png`): I built the historical analytics view using Recharts — temperature and light time-series charts with time-range filters (1h/24h/7d), a moving average toggle (5-point window), min/max reference lines, and a CSV export button. The stats panel shows avg/max/min for both temp and light.

4. **Alerts** (`04-alerts.png`): I built the alerts panel with the three-state lifecycle I designed (ACTIVE → ACKNOWLEDGED → RESOLVED). Users can acknowledge active alerts and resolve acknowledged ones. Alerts can be filtered by severity (critical/warning/info) and status (active/acknowledged/resolved).

5. **API & Database** (`05-api-database-proof.png`): I implemented the API client (`lib/api.js`) that handles all HTTP communication with Bearer token auth, error handling for 401/500, and structured response parsing. This screenshot proves every endpoint works with real data.

6. **Tests** (`06-test-results.png`): I wrote 38 automated tests covering the core logic I built — stats computations, API client behavior, config constants, input validation, alert lifecycle states, and command validation.

---

## Honest Paragraph

The dashboard, analytics, auth implementation, test suite, and all documentation (README, PROTOCOL, INTEGRATION, CAPSTONE, CONTRIBUTION) were genuinely my work, built from the ground up to consume REST APIs and MQTT WebSocket streams. Abijith and I collaborated heavily on the API contract (PROTOCOL.md) — we negotiated the JSON payload shapes, field names, command set, and the auth header format together. Abijith built the firmware and ingestion API that my dashboard consumes; I built the frontend that visualizes his backend. When the alert lifecycle was upgraded from a boolean to a three-state system, I designed the frontend UI and API endpoints, and updated the database migration. The integration testing was always a joint effort — we ran the full chain together (device → MQTT → API → dashboard) and documented results in INTEGRATION.md.
