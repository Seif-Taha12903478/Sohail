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

## Week 8 — Capstone Deployment

### Integration Date: Thursday, Week 8

### Deployment Targets
| Component     | Platform         | Status |
|---------------|------------------|--------|
| Dashboard     | Vercel/Netlify   | Deployed |
| Ingestion API | Render/Railway   | Deployed |
| ESP32 Device  | Wokwi (online)   | Running |
| Database      | Supabase         | Provisioned |

### Final End-to-End Test
1. Open Wokwi ESP32 simulation → device connects to Wi-Fi + MQTT
2. Telemetry flows to dashboard live view in real time
3. Historical charts populate from API
4. Send MODE=2 from dashboard → device speeds up → telemetry reflects change
5. Raise temp above threshold → alert appears on dashboard with severity
6. API request without token → 401 rejected
7. API request with token → data returned successfully
8. Data persists across device restart

Result: **ALL TESTS PASSED**
