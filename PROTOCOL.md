# PROTOCOL — IoT Environmental Monitoring Platform

This document defines all communication contracts across the platform: UART telemetry frames, MQTT topics/payloads, REST API endpoints, alert rules, and the auth scheme.

---

## Week 4 — UART Serial Protocol

### Telemetry Frame Format
```
<T:24.5,L:380,MODE:1>
```
- `<` — frame start delimiter
- `T:` — temperature in °C (1 decimal)
- `L:` — light level (0–1000)
- `MODE:` — current sampling mode (1=normal, 2=fast, 3=standby)
- `>` — frame end delimiter

### Command Set
| Command      | Description                        | Response              |
|--------------|------------------------------------|-----------------------|
| `MODE=<n>`   | Set sampling mode (1–3)            | `ACK:MODE=<n>`        |
| `RATE=<ms>`  | Set sample interval (100–60000 ms) | `ACK:RATE=<ms>`       |
| `STATUS?`    | Query current state                | `MODE=x RATE=y T=z L=w` |

### Error Responses
| Code           | Condition                          |
|----------------|------------------------------------|
| `ERR:UNKNOWN`  | Unrecognized command               |
| `ERR:RANGE`    | Value out of allowed range        |
| `ERR:OVERFLOW` | Input exceeded 64-char buffer     |

### Layer Interface (Abijith → Seif)
| Function                          | Owner    | Description                              |
|-----------------------------------|----------|------------------------------------------|
| `Reading getLatestReading()`      | Abijith  | Returns latest {temp, light, mode, ts}   |
| `void setMode(int m)`             | Abijith  | Sets sampling mode 1–3                   |
| `void setSampleRate(unsigned long)`| Abijith | Sets sampling interval in ms            |
| `bool hasNewReading()`            | Abijith  | True if a new reading is available       |
| `void sendTelemetry()`            | Seif     | Formats and sends frame over Serial      |
| `void parseCommand(const char*)`  | Seif     | Parses and executes UART commands        |

---

## Week 5 — MQTT Protocol

### Topics
| Topic               | Direction       | Description                          |
|---------------------|-----------------|--------------------------------------|
| `device/telemetry`  | Device → Cloud  | JSON telemetry, published per cycle |
| `device/commands`   | Dashboard → Device | JSON command to change device state |

### Telemetry Payload (JSON)
```json
{
  "device_id": "esp32-001",
  "temp": 24.5,
  "light": 380,
  "mode": 1
}
```

### Command Payload (JSON)
```json
{ "cmd": "MODE", "value": 2 }
```
```json
{ "cmd": "RATE", "value": 300 }
```

### Broker
- **Public broker:** `broker.hivemq.com` (port 1883 for TCP, 8000 for WebSocket)
- **No authentication required** (public broker)

---

## Week 6 — REST API Contract

### Base URL
`http://localhost:3001` (local) or deployed URL (production)

### Authentication
All API endpoints (except `/health`) require a Bearer token:
```
Authorization: Bearer <token>
```
Default demo token: `iot-platform-demo-token` (override via `API_TOKEN` env var).

Returns `401 Unauthorized` if missing or invalid.

### Endpoints

#### `GET /devices`
Returns list of known devices.
```json
[
  { "device_id": "esp32-001", "name": "esp32-001", "location": "Wokwi Simulation", "created_at": "..." }
]
```

#### `GET /readings?device=<id>&from=<ts>&to=<ts>`
Returns historical readings for a device within an optional time range.
- `device` — **required** device_id
- `from` — ISO timestamp (optional)
- `to` — ISO timestamp (optional)
- Returns max 1000 rows, newest first

```json
[
  { "id": "uuid", "device_id": "esp32-001", "temp": 24.5, "light": 380, "mode": 1, "ts": "2024-..." }
]
```

#### `GET /alerts?device=<id>&from=<ts>&to=<ts>`
Returns alert records, optionally filtered by device and time range.
```json
[
  {
    "id": "uuid", "device_id": "esp32-001", "field": "temp", "operator": ">",
    "value": 35, "severity": "critical", "message": "temp > 35 (current: 38.2)",
    "ts": "2024-...", "resolved": false
  }
]
```

#### `GET /thresholds?device=<id>`
Returns configured alert thresholds.

#### `POST /thresholds`
Create a new alert threshold.
```json
{ "device_id": "esp32-001", "field": "temp", "operator": ">", "value": 35, "severity": "critical" }
```

#### `DELETE /thresholds/:id`
Delete a threshold.

#### `POST /command`
Publish a command to the device via MQTT.
```json
{ "cmd": "MODE", "value": 2 }
```

#### `GET /health`
Public health check (no auth required).

### Stored Record Shape
| Field       | Type         | Description                          |
|-------------|--------------|--------------------------------------|
| `id`        | uuid         | Primary key                          |
| `device_id` | text (FK)    | References devices table             |
| `temp`      | real         | Temperature in °C                   |
| `light`     | integer      | Light level 0–1000                   |
| `mode`      | integer      | Sampling mode 1–3                    |
| `ts`        | timestamptz  | Timestamp of reading                 |

---

## Week 7 — Alerting & Security Contract

### Auth Scheme
- **Type:** Bearer token (API key)
- **Header:** `Authorization: Bearer <token>`
- **Storage:** Environment variable `API_TOKEN`, never committed
- **Behavior:** Missing/invalid token → `401 Unauthorized`

### Alert Threshold Config Shape
```json
{
  "device_id": "esp32-001", "field": "temp", "operator": ">",
  "value": 35, "severity": "critical", "enabled": true
}
```

### Severity Levels
| Severity   | Color    | Use Case                              |
|------------|----------|---------------------------------------|
| `info`     | blue     | Informational, non-critical           |
| `warning`  | amber    | Worth attention, not urgent           |
| `critical` | red      | Immediate attention required          |

### Debounce Rule
- Same threshold breach does not re-fire for 30 seconds
- Cooldown tracked per `device_id:field:operator:value` key
- When value returns to normal, cooldown is cleared

### Alert Record Shape
| Field       | Type         | Description                          |
|-------------|--------------|--------------------------------------|
| `id`        | uuid         | Primary key                          |
| `device_id` | text (FK)    | Device that triggered the alert      |
| `field`     | text         | Which field breached (temp/light)    |
| `operator`  | text         | Comparison operator                  |
| `value`     | real         | Threshold value                      |
| `severity`  | text         | info / warning / critical            |
| `message`   | text         | Human-readable description            |
| `ts`        | timestamptz  | When alert was raised                |
| `resolved`  | boolean      | Whether the alert has been resolved  |
