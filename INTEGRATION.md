# INTEGRATION — End-to-End Test Log

This document records the integration milestones, test cases, and conflict resolutions across all weeks.

---

## Week 4 — UART Serial Integration

### Integration Date: Thursday, Week 4

### Test Cases

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Telemetry output | Boot device, observe Serial monitor | Frames every 1000ms: `<T:xx.x,L:xxx,MODE:1>` | PASS |
| 2 | Mode change via command | Send `MODE=2` over Serial | Ack `ACK:MODE=2`, frames arrive every 300ms | PASS |
| 3 | Rate change | Send `RATE=500` | Ack `ACK:RATE=500`, interval changes | PASS |
| 4 | Status query | Send `STATUS?` | Returns `MODE=x RATE=y T=z L=w` | PASS |
| 5 | Standby mode | Send `MODE=3` | No new telemetry frames emitted | PASS |
| 6 | Unknown command | Send `HELLO` | Returns `ERR:UNKNOWN` | PASS |
| 7 | Bad value | Send `MODE=9` | Returns `ERR:RANGE` | PASS |
| 8 | Buffer overflow | Send 70+ chars | Returns `ERR:OVERFLOW`, recovers | PASS |

### Conflicts & Resolutions
1. **Frame format mismatch:** Initially Abijith returned raw float values; Seif expected 1-decimal format. Resolved by agreeing on `%.1f` formatting in `sendTelemetry()`.
2. **Mode enum values:** Seif used 0-indexed modes; Abijith used 1-indexed. Resolved by standardizing to 1=normal, 2=fast, 3=standby in PROTOCOL.md.
3. **Serial buffer handling:** Initial parser didn't handle `\r\n` line endings from Wokwi. Fixed by checking for both `\n` and `\r` as terminators.

---

## Week 5 — MQTT Wireless Integration

### Integration Date: Thursday, Week 5

### Test Cases

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Wi-Fi connection | Boot ESP32 in Wokwi | Connects to Wokwi-GUEST, prints IP | PASS |
| 2 | MQTT connection | Auto-connect after Wi-Fi | Connects to HiveMQ broker | PASS |
| 3 | Telemetry publish | Observe dashboard live view | JSON frames appear in real time | PASS |
| 4 | Command from dashboard | Click "Fast" mode button | Device receives `{"cmd":"MODE","value":2}` | PASS |
| 5 | Mode reflected in telemetry | After command, check telemetry | `mode` field changes to 2 | PASS |
| 6 | Auto-reconnect | Disconnect broker briefly | Device reconnects automatically | PASS |
| 7 | Malformed payload | Dashboard receives bad JSON | Error logged, no crash | PASS |

### Conflicts & Resolutions
1. **WebSocket vs TCP:** Wokwi ESP32 supports both, but browser dashboard needs WebSocket. Used port 8000 for WS, port 1883 for device.
2. **Topic naming:** Initially used `telemetry` and `commands` without device prefix. Changed to `device/telemetry` and `device/commands` for clarity.
3. **JSON field naming:** Abijith used `temperature`, Seif expected `temp`. Standardized to `temp` in PROTOCOL.md.

---

## Week 6 — Persistence & Analytics Integration

### Integration Date: Saturday, Week 6

### Test Cases

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Ingestion stores readings | Start ingestion service, run device | Readings appear in database | PASS |
| 2 | API returns history | `GET /readings?device=esp32-001` | Returns array of readings with timestamps | PASS |
| 3 | Time-range filter | `GET /readings?device=esp32-001&from=<1h ago>` | Only last-hour readings returned | PASS |
| 4 | Device list | `GET /devices` | Returns both device IDs | PASS |
| 5 | Multi-device | Run 2 Wokwi tabs with different device_ids | Both devices appear in selector, data stored separately | PASS |
| 6 | Charts render | Open History tab, select device | Temp and light charts render with data points | PASS |
| 7 | Persistence across restart | Stop device, restart, check history | Previous readings still in API response | PASS |
| 8 | Live + history coexist | Switch between Live and History tabs | Both work independently | PASS |

### Conflicts & Resolutions
1. **Timestamp format:** Device sent `millis()` as timestamp; ingestion needed absolute time. Resolved by using `now()` (database default) at insertion time.
2. **CORS:** Dashboard on port 5173, API on port 3001. Added `cors` middleware to Express.
3. **Date parsing:** Dashboard initially sent epoch numbers; API expected ISO strings. Standardized to ISO 8601.

---

## Week 7 — Alerting & API Security Integration

### Integration Date: Friday, Week 7

### Test Cases

| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Threshold breach triggers alert | Set temp > 30, raise sensor above 30 | Alert appears in database and dashboard | PASS |
| 2 | Alert debounce | Keep temp above 30 for 60s | Only one alert per 30s window, no spam | PASS |
| 3 | Severity display | Check alerts panel | Warning/critical badges show with correct colors | PASS |
| 4 | Unauthenticated request | `GET /devices` without token | Returns 401 Unauthorized | PASS |
| 5 | Authenticated request | `GET /devices` with valid Bearer token | Returns device list | PASS |
| 6 | Dashboard login | Enter token on login screen | Dashboard authenticates, data loads | PASS |
| 7 | Token in env var | Check `.env.example` | Token not hardcoded in source | PASS |
| 8 | Alert resolved | Lower temp below threshold | Cooldown cleared, alert can re-fire if breached again | PASS |

### Conflicts & Resolutions
1. **Token storage:** Initially hardcoded in dashboard source. Moved to `localStorage` with env var fallback.
2. **Alert debounce key:** First implementation used only `device_id:field`, which prevented different thresholds on the same field. Changed to include operator and value in the key.
3. **401 handling in dashboard:** Initial fetch calls didn't handle 401 gracefully. Added `authFailed` state that redirects to login screen.

---

## Week 8 — Capstone: Modularization, Testing & Documentation

### Integration Date: Thursday, Week 8

### Database Migration: Alert Lifecycle
Added `status`, `acknowledged_at`, `resolved_at`, `acknowledged_by` columns to the `alerts` table. Migrated existing rows from the boolean `resolved` column to the new `status` column. Added CHECK constraint for valid status values and an index on `status`.

### New API Endpoints
| # | Test | Steps | Expected | Result |
|---|------|-------|----------|--------|
| 1 | Acknowledge alert | `PATCH /alerts/:id/ack` | Status changes to `acknowledged`, `acknowledged_at` set | PASS |
| 2 | Resolve alert | `PATCH /alerts/:id/resolve` | Status changes to `resolved`, `resolved_at` set | PASS |
| 3 | Resolve already-resolved | `PATCH /alerts/:id/resolve` on resolved alert | Returns 404 | PASS |
| 4 | Stats endpoint | `GET /stats?device=esp32-001` | Returns avg/max/min temp and light, count | PASS |
| 5 | Rate limiting | Send 101+ requests in 60s | 429 Too Many Requests after 100 | PASS |
| 6 | Input validation | `POST /thresholds` with invalid field | Returns 400 with details array | PASS |
| 7 | 404 handler | `GET /nonexistent` | Returns 404 with error message | PASS |

### Automated Test Suite
| # | Test Suite | Framework | Tests | Result |
|---|------------|-----------|-------|--------|
| 1 | stats.test.js (computeStats, movingAverage, exportToCsv) | Vitest | 9 | PASS |
| 2 | api.test.js (apiGet, apiPost, apiPatch, apiDelete, ApiError) | Vitest | 7 | PASS |
| 3 | config.test.js (config, TIME_RANGES, MODE_NAMES, formatters) | Vitest | 7 | PASS |
| 4 | validation.test.js (validateDeviceId, validateThresholdInput) | Node.js | 11 | PASS |
| 5 | validation.test.js (alert lifecycle, rate limiter, command validation) | Node.js | 4 | PASS |
| | **Total** | | **38** | **ALL PASS** |

### Frontend Modularization
Verified that the refactored modular structure works end-to-end:
- `config.js` — centralized config, no hardcoded URLs
- `hooks/useMqtt.js` — MQTT connection and message handling
- `hooks/useApiData.js` — API data fetching with retry support
- `lib/api.js` — API client with Bearer auth and error handling
- `lib/stats.js` — stats computations, moving average, CSV export
- `components/LoginScreen.jsx` — token login
- `components/LiveView.jsx` — live telemetry, metric cards, device control, stats panel
- `components/HistoryView.jsx` — charts with moving average, min/max markers, CSV export
- `components/AlertsView.jsx` — alert panel with ack/resolve + filtering

### Screenshot Evidence
| Screenshot | Verified Feature |
|------------|----------------|
| `screenshots/01-login.png` | Token-based login screen |
| `screenshots/02-live-view.png` | Live telemetry, metric cards, device control, log |
| `screenshots/03-history-charts.png` | Historical temp/light charts with real data |
| `screenshots/04-alerts.png` | Alerts panel with severity + status badges |
| `screenshots/05-api-database-proof.png` | All API endpoints with real database rows |
| `screenshots/06-test-results.png` | 38/38 automated tests passing |

### Final End-to-End Test
1. Open Wokwi ESP32 simulation → device connects to Wi-Fi + MQTT
2. Telemetry flows to dashboard live view in real time
3. Historical charts populate from API
4. Send MODE=2 from dashboard → device speeds up → telemetry reflects change
5. Raise temp above threshold → alert appears on dashboard with severity
6. Acknowledge alert via dashboard → status changes to `acknowledged`
7. Resolve alert via dashboard → status changes to `resolved`
8. Export historical readings as CSV
9. API request without token → 401 rejected
10. API request with token → data returned successfully
11. Data persists across device restart
12. Run `npm test` in dashboard → 23/23 pass
13. Run `npm test` in ingestion-api → 15/15 pass

Result: **ALL TESTS PASSED**
