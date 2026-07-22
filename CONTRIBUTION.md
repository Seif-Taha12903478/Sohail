# CONTRIBUTION — Seif

## Layer Owned

**Dashboard, Telemetry/Comms, Auth, and Historical Analytics** — the entire user-facing side of the platform across all 6 weeks.

## Evidence

### Branch
- `seif/dashboard-comms` — all dashboard and comms layer work

### Pull Requests
- [PR #1] Week 4: Telemetry comms layer (UART framing + command parser)
- [PR #3] Week 5: MQTT telemetry + command over Wi-Fi (ESP32)
- [PR #5] Week 6: Historical charts + time-range filter + device selector
- [PR #7] Week 7: API auth (Bearer token) + alerts panel with severity
- [PR #9] Week 8: Dashboard deployment config + final polish

### Key Commits
1. `firmware/telemetry_comms.h` — UART telemetry frame format and command parser with defensive error handling (ERR:UNKNOWN, ERR:RANGE, ERR:OVERFLOW)
2. `firmware/firmware_esp32.ino` — MQTT command callback with JSON parsing, MODE/RATE command handling, auto-reconnect logic
3. `dashboard/src/App.jsx` — Full dashboard: live telemetry view, historical charts (Recharts), alerts panel, device control, API token auth
4. `dashboard/src/styles.css` — Complete dark-theme UI design with responsive layout, metric cards, chart containers, alert severity styling
5. `PROTOCOL.md` — Defined MQTT topics, JSON payload shapes, REST API contract, auth scheme, alert threshold config
6. `dashboard/vite.config.js` + `dashboard/index.html` — Vite + React project setup with Inter font, responsive meta

### Individual Walkthrough
A 3–5 minute screen recording demonstrating:
1. Logging into the dashboard with the API token
2. Live telemetry appearing in real time from the ESP32
3. Switching device modes (Normal → Fast → Standby) and seeing telemetry rate change
4. Opening the History tab, selecting a device, and viewing temp/light charts
5. Changing the time range filter and seeing the chart update
6. Showing the Alerts panel with severity badges
7. Demonstrating 401 rejection when the token is removed

### Honest Paragraph
The dashboard, comms layer (UART framing + MQTT command parsing), auth implementation, and all documentation related to the protocol and API contract were genuinely my work. Abijith and I collaborated closely on the PROTOCOL.md contract — we negotiated the frame format, JSON field names, and command set together on Monday each week. Abijith helped me test the dashboard by running the ESP32 simulation while I verified the live view. I helped Abijith debug the MQTT callback JSON parsing by testing malformed payloads from the dashboard's command sender. The integration on Thursdays was always a joint effort — we tested end-to-end together and logged results in INTEGRATION.md.

---

# CONTRIBUTION — Abijith

## Layer Owned

**Firmware (Sensor & Control), Ingestion API, Alert Engine, and Database** — the entire backend and device-side across all 6 weeks.

## Evidence

### Branch
- `abijith/firmware-ingestion` — all firmware and ingestion work

### Pull Requests
- [PR #2] Week 4: Sensor & control layer (non-blocking sampling, modes, clean interface)
- [PR #4] Week 5: ESP32 firmware port (Wi-Fi + MQTT telemetry publishing)
- [PR #6] Week 6: Ingestion service (MQTT subscriber → DB → REST API)
- [PR #8] Week 7: Alert engine + API security (thresholds, debounce, Bearer auth)
- [PR #10] Week 8: API deployment config + database migration

### Key Commits
1. `firmware/sensor_control.h` — Non-blocking sensor sampling with millis(), 3 modes, clean interface (getLatestReading, setMode, setSampleRate)
2. `firmware/firmware_esp32.ino` — ESP32 Wi-Fi connection, MQTT publish/subscribe, auto-reconnect, sensor sampling loop
3. `ingestion-api/src/index.js` — Express REST API, MQTT subscriber, Supabase integration, alert engine with debounce, Bearer token auth middleware
4. `ingestion-api/package.json` — Dependencies: express, mqtt, @supabase/supabase-js, cors, dotenv
5. Database migration — Created devices, readings, alerts, thresholds tables with RLS policies and indexes
6. `firmware/diagram.json` + `firmware/diagram_esp32.json` — Wokwi wiring diagrams for Arduino Uno and ESP32

### Individual Walkthrough
A 3–5 minute screen recording demonstrating:
1. Starting the ingestion API service and showing MQTT connection
2. Running the ESP32 Wokwi simulation and showing telemetry arriving in the API console
3. Querying `GET /readings` via curl with Bearer token and seeing stored data
4. Querying `GET /devices` and showing multiple device IDs
5. Setting a threshold via `POST /thresholds` and triggering an alert by raising sensor value
6. Showing the alert in `GET /alerts` with severity and debounce behavior
7. Demonstrating 401 when token is missing, 200 when present

### Honest Paragraph
The sensor/control firmware, ESP32 Wi-Fi/MQTT integration, ingestion API, alert engine, database schema, and API security were genuinely my work. Seif and I collaborated on defining the interface contract in PROTOCOL.md — we agreed on function signatures, JSON field names, and the command set together. Seif helped me test the ingestion service by sending commands from the dashboard while I monitored the API logs. I helped Seif by providing the exact API response shapes so the dashboard could parse them correctly. The Thursday integration sessions were joint — we ran the full chain together (device → MQTT → API → dashboard) and documented results in INTEGRATION.md.
