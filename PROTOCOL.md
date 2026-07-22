# PROTOCOL — IoT Environmental Monitoring Platform

This document defines all communication contracts across the platform: UART telemetry frames, MQTT topics/payloads, REST API endpoints, alert rules, auth scheme, and the alert lifecycle.

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

## Week 6–8 — REST API Contract

### Base URL
`http://localhost:3001` (local) or deployed URL (production)

### Authentication
All API endpoints (except `/health`) require a Bearer token:
```
Authorization: Bearer <token>
```
Default demo token: `iot-platform-demo-token` (override via `API_TOKEN` env var).

Returns `401 Unauthorized` if missing or invalid:
```json
{ "error": "Missing or invalid Authorization header. Expected: Bearer <token>" }
```

### Rate Limiting
- **Limit:** 100 requests per 60 seconds per IP address
- **Exceeded:** Returns `429 Too Many Requests`
```json
{ "error": "Rate limit exceeded. Try again in a minute." }
```

### Input Validation
All POST/PATCH endpoints validate input. Invalid input returns `400 Bad Request`:
```json
{ "error": "Validation failed", "details": ["device_id must be a non-empty alphanumeric string (max 100 chars)", "field must be one of: temp, light, mode"] }
```

### Endpoints

#### `GET /health`
Public health check (no auth required).
```json
{ "status": "ok", "mqtt": "connected" }
```

#### `GET /devices`
Returns list of known devices.
```json
[
  { "device_id": "esp32-001", "name": "esp32-001", "location": "Wokwi Simulation", "created_at": "2026-07-22T11:13:13Z" }
]
```

#### `GET /readings?device=<id>&from=<ISO>&to=<ISO>`
Returns historical readings for a device within an optional time range.
- `device` — **required** device_id (alphanumeric, max 100 chars)
- `from` — ISO 8601 timestamp (optional)
- `to` — ISO 8601 timestamp (optional)
- Returns max 1000 rows, newest first

```json
[
  { "id": "uuid", "device_id": "esp32-001", "temp": 24.5, "light": 380, "mode": 1, "ts": "2026-07-22T11:13:13Z" }
]
```

#### `GET /alerts?device=<id>&from=<ISO>&to=<ISO>&status=<status>&severity=<severity>`
Returns alert records, optionally filtered by device, time range, status, and severity.
- `status` — `active`, `acknowledged`, or `resolved` (optional)
- `severity` — `info`, `warning`, or `critical` (optional)
- Returns max 200 rows, newest first

```json
[
  {
    "id": "uuid",
    "device_id": "esp32-001",
    "field": "temp",
    "operator": ">",
    "value": 30,
    "severity": "critical",
    "message": "temp > 30 (current: 31.4)",
    "ts": "2026-07-22T10:28:13Z",
    "resolved": false,
    "status": "active",
    "acknowledged_at": null,
    "resolved_at": null,
    "acknowledged_by": null
  }
]
```

#### `PATCH /alerts/:id/ack`
Acknowledges an active alert. Transitions status from `active` → `acknowledged`.
- Only works on alerts with `status = 'active'`
- Returns `404` if alert not found or not in active state

```json
{
  "id": "uuid",
  "status": "acknowledged",
  "acknowledged_at": "2026-07-22T11:30:00Z",
  "resolved": false
}
```

#### `PATCH /alerts/:id/resolve`
Resolves an active or acknowledged alert. Transitions status to `resolved`.
- Works on alerts with `status = 'active'` or `status = 'acknowledged'`
- Returns `404` if alert not found or already resolved

```json
{
  "id": "uuid",
  "status": "resolved",
  "resolved_at": "2026-07-22T11:35:00Z",
  "resolved": true
}
```

#### `GET /thresholds?device=<id>`
Returns configured alert thresholds for a device (or all if no device specified).

```json
[
  {
    "id": "uuid",
    "device_id": "esp32-001",
    "field": "temp",
    "operator": ">",
    "value": 30,
    "severity": "critical",
    "enabled": true,
    "created_at": "2026-07-22T11:13:13Z"
  }
]
```

#### `POST /thresholds`
Create a new alert threshold. Validates: device_id (alphanumeric), field (temp/light/mode), operator (> < >= <= ==), value (number), severity (info/warning/critical).

**Request:**
```json
{ "device_id": "esp32-001", "field": "temp", "operator": ">", "value": 35, "severity": "critical" }
```

**Response (201 Created):**
```json
{ "id": "uuid", "device_id": "esp32-001", "field": "temp", "operator": ">", "value": 35, "severity": "critical", "enabled": true, "created_at": "2026-07-22T11:20:00Z" }
```

#### `DELETE /thresholds/:id`
Delete a threshold. Returns `204 No Content` on success.

#### `GET /stats?device=<id>`
Returns aggregated statistics for a device over the last 24 hours.
```json
{
  "count": 240,
  "avgTemp": 27.3,
  "maxTemp": 35.7,
  "minTemp": 22.1,
  "avgLight": 420.5,
  "maxLight": 548,
  "minLight": 361
}
```

#### `POST /command`
Publish a command to the device via MQTT. Validates: cmd (MODE or RATE), value (number).
- MODE: value must be 1, 2, or 3
- RATE: value must be between 100 and 60000

**Request:**
```json
{ "cmd": "MODE", "value": 2 }
```

**Response:**
```json
{ "status": "sent", "payload": "{\"cmd\":\"MODE\",\"value\":2}" }
```

---

## Alert Lifecycle

### States
| Status          | Description                              | Color   |
|-----------------|------------------------------------------|---------|
| `active`        | Alert fired, needs attention             | red     |
| `acknowledged`  | Someone saw it, working on it            | amber   |
| `resolved`      | Issue fixed, alert cleared               | green   |

### State Transitions
```
active ──── (PATCH /alerts/:id/ack) ────→ acknowledged
active ──── (PATCH /alerts/:id/resolve) ─→ resolved
acknowledged ── (PATCH /alerts/:id/resolve) ──→ resolved
```

### Database Columns
| Field              | Type         | Description                              |
|--------------------|--------------|------------------------------------------|
| `id`               | uuid (PK)    | Primary key                              |
| `device_id`        | text (FK)    | Device that triggered the alert          |
| `field`            | text         | Which field breached (temp/light)        |
| `operator`         | text         | Comparison operator                      |
| `value`            | real         | Threshold value                          |
| `severity`         | text         | info / warning / critical                |
| `message`          | text         | Human-readable description               |
| `ts`               | timestamptz  | When alert was raised                    |
| `resolved`         | boolean      | Deprecated — use `status` instead         |
| `status`           | text         | active / acknowledged / resolved          |
| `acknowledged_at`  | timestamptz  | When alert was acknowledged              |
| `resolved_at`      | timestamptz  | When alert was resolved                  |
| `acknowledged_by`  | text         | Who acknowledged the alert              |

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

---

## Error Responses

All errors return structured JSON with an `error` field and optional `details` array:

| Status | Condition                                  |
|--------|--------------------------------------------|
| 400    | Invalid input (validation failed)          |
| 401    | Missing or invalid Bearer token             |
| 404    | Endpoint not found / alert not found       |
| 429    | Rate limit exceeded                        |
| 500    | Database or internal server error           |

```json
{ "error": "Validation failed", "details": ["field must be one of: temp, light, mode"] }
```
