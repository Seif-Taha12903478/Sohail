# IoT Environmental Monitoring Platform

A full-stack IoT system: environmental sensor → ESP32 → MQTT → ingestion service → database → secured REST API → live dashboard with historical charts and alerting.

Built over 6 weeks as a two-person team project. Each member owned a distinct layer.

## Architecture

```
[ESP32 + Sensors]  →  [Wi-Fi]  →  [MQTT Broker (HiveMQ)]  →  [Ingestion API (Node.js)]
                                                                    ↓
                                                              [Supabase Database]
                                                                    ↓
                                                              [Secured REST API]
                                                                    ↓
                                                              [Dashboard (React)]
                                                              ├── Live telemetry
                                                              ├── Historical charts
                                                              ├── Alerts panel
                                                              └── Device control
```

## Features

- **Live telemetry** — real-time temp/light/mode via MQTT WebSocket
- **Historical charts** — time-series graphs with range filters (1h / 24h / 7d)
- **Multi-device support** — device selector, separate data per device_id
- **Alerting** — threshold-based alerts with severity (info/warning/critical) and debounce
- **API security** — Bearer token authentication on all data endpoints
- **Remote control** — change device mode and sample rate from the dashboard
- **Auto-reconnect** — device reconnects to Wi-Fi/MQTT on disconnection

## Tech Stack

| Layer           | Technology                          |
|-----------------|-------------------------------------|
| Firmware        | Arduino C++ (ESP32, Wokwi)          |
| Messaging       | MQTT (HiveMQ public broker)          |
| Ingestion API   | Node.js + Express                   |
| Database        | Supabase (PostgreSQL)               |
| Dashboard       | React + Vite + Recharts             |
| Auth            | Bearer token (API key)              |

## Repository Structure

```
/
├── firmware/              # ESP32 device code — owner: Abijith
│   ├── firmware.ino       # Week 4: Arduino Uno UART version
│   ├── firmware_esp32.ino # Week 5+: ESP32 Wi-Fi/MQTT version
│   ├── sensor_control.h   # Sensor & control layer
│   ├── telemetry_comms.h  # Telemetry & command layer
│   ├── diagram.json       # Wokwi wiring (Arduino Uno)
│   └── diagram_esp32.json # Wokwi wiring (ESP32)
├── ingestion-api/         # MQTT subscriber + REST API + alerts — owner: Abijith
│   ├── src/index.js       # Express server, MQTT client, alert engine
│   ├── package.json
│   └── .env.example
├── dashboard/             # Web UI — owner: Seif
│   ├── src/App.jsx        # Main dashboard (live, history, alerts)
│   ├── src/styles.css     # Dashboard styling
│   ├── package.json
│   └── vite.config.js
├── PROTOCOL.md            # All communication contracts
├── INTEGRATION.md         # End-to-end test log
├── README.md              # This file
├── LEARNING.md            # Individual learning notes
├── CONTRIBUTION.md        # Individual contribution evidence
└── CAPSTONE.md            # Capstone reflection
```

## Getting Started

### 1. Database (Supabase)
The Supabase project is pre-provisioned. Tables (`devices`, `readings`, `alerts`, `thresholds`) are created via migration. See `PROTOCOL.md` for schema details.

### 2. Ingestion API
```bash
cd ingestion-api
cp .env.example .env   # Fill in Supabase URL + service role key
npm install
npm start               # Runs on port 3001
```

### 3. Dashboard
```bash
cd dashboard
npm install
npm run dev             # Runs on port 5173
```
Open http://localhost:5173 and enter the API token (default: `iot-platform-demo-token`).

### 4. ESP32 Firmware (Wokwi)
1. Go to [wokwi.com](https://wokwi.com/projects/new/esp32)
2. Copy the contents of `firmware/firmware_esp32.ino` into the sketch
3. Copy `firmware/diagram_esp32.json` into the `diagram.json` tab
4. Start simulation — device connects to Wi-Fi and MQTT automatically

## Live Links
- **Dashboard:** [deployed URL — add after deployment]
- **API:** [deployed URL — add after deployment]
- **Wokwi:** [Wokwi project URL — add after creating]

## Team

| Member   | Owned Layer                                    |
|----------|-----------------------------------------------|
| Abijith  | Firmware (sensor/control) + Ingestion API + Alerts |
| Seif     | Dashboard + Telemetry/Comms + Auth + Charts   |

See `CONTRIBUTION.md` for detailed individual contribution evidence.
