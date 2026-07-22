# LEARNING — Individual Notes

## Abijith — Sensor & Control Layer

### Sensors & Sampling
Analog sensors like LDRs and potentiometers output a continuous voltage that the ADC converts to a 0–1023 range (Arduino Uno, 10-bit) or 0–4095 (ESP32, 12-bit). To get a real-world unit, you map this raw value: for temperature, `(raw / 4095.0) * 50.0` gives an approximate °C. Digital sensors like DHT22 use their own protocol and give calibrated values directly, but analog is simpler for simulation. Sampling rate matters because reading too fast wastes power and floods the channel, while reading too slow misses events. The right rate depends on what you're measuring — temperature changes slowly (1000ms is fine), but a button press needs instant response.

### Non-Blocking Architecture
Using `delay()` freezes the entire microcontroller — no other code runs during the delay. This breaks the comms layer because it can't process incoming UART commands while the sensor waits. The solution is `millis()`-based timing: record the last sample time, and only sample when `millis() - lastSample >= interval`. This keeps `loop()` free to run other tasks (like serial parsing) in parallel. Exposing a clean interface (`getLatestReading()`, `setMode()`, `setSampleRate()`) means the comms layer never touches pins directly — it just calls functions. This separation is critical for integration: each layer can be developed and tested independently.

### Wi-Fi & MQTT on ESP32
The ESP32 has built-in Wi-Fi, unlike the Arduino Uno. Joining a network is straightforward with `WiFi.begin()`, but you must wait for `WL_CONNECTED` before proceeding. IoT needs a transport beyond Serial because Serial requires a physical wire — MQTT over Wi-Fi lets the device report from anywhere. MQTT's publish/subscribe model fits IoT perfectly: the device publishes to a topic, any number of subscribers receive it, and neither side needs to know about the other. This decoupling means you can add a dashboard, a database logger, and a mobile app all subscribing to the same topic without changing the device firmware.

### Persistence & Ingestion
Streaming data is live but ephemeral — once it scrolls off the screen, it's gone. Persistence means every reading gets a timestamp and is stored, making it queryable historically. IoT sensor data is a time series: each record is a (timestamp, value) pair, and the timestamp is essential for ordering, range queries, and trend analysis. The ingestion pattern — a service subscribes to MQTT and writes to the database — decouples the device from storage. The device doesn't know or care where data goes; it just publishes. The dashboard reads through a REST API, never touching the database directly, which adds a security and abstraction boundary.

### Alerting & Debouncing
A threshold rule evaluates each reading against a condition (e.g., temp > 35). Without debouncing, the same breach fires an alert on every single sample — 30 alerts per minute at 2-second intervals. Hysteresis/debounce means tracking that we already fired for this breach and waiting before firing again. We use a 30-second cooldown per threshold key. When the value returns to normal, the cooldown clears so a future breach can fire fresh. Severity tags (info/warning/critical) let the dashboard prioritize display and let operators filter noise from signal.

---

## Seif — Telemetry, Comms & Dashboard Layer

### Telemetry & Framing
Telemetry is structured data about a device's state, sent periodically. Raw values like `24.5` are ambiguous — is that temperature? voltage? A frame adds structure: delimiters (`<...>`), labels (`T:`, `L:`, `MODE:`), and a terminator make it self-describing. We chose a readable ASCII format (`<T:24.5,L:380,MODE:1>`) over compact binary because it's debuggable in a serial monitor and easy to parse with `sscanf` or `strtok`. The trade-off is size — binary would be smaller — but for our data rate (1 frame/second), readability wins. Over the network, JSON replaces ASCII frames for interoperability: any system can parse JSON without knowing our custom format.

### Two-Way Protocols & Defensive Parsing
A protocol isn't just output — it's also input. Commands let the host control the device at runtime: `MODE=2` changes sampling speed, `RATE=500` adjusts the interval, `STATUS?` queries state. Every command must return an ack or error — silence is a bug. Defensive parsing means handling malformed input without crashing: unknown commands return `ERR:UNKNOWN`, out-of-range values return `ERR:RANGE`, and buffer overflow returns `ERR:OVERFLOW` and resets. The parser never trusts input length, never assumes null-termination, and never blocks waiting for more data. This same defensive mindset carries to MQTT: malformed JSON payloads are caught with try/catch and logged, never crashing the device.

### JSON Payloads & Network Reliability
Raw `<...>` frames work over Serial but not over a network — different systems need a common language. JSON is that language: structured, self-describing, and parseable by anything. Our telemetry payload `{"device_id":"esp32-001","temp":24.5,"light":380,"mode":1}` is readable by the dashboard, the ingestion service, and any future consumer. Wireless systems must handle dropped connections: the ESP32 auto-reconnects to Wi-Fi and MQTT on failure. The dashboard handles malformed messages gracefully — a bad JSON payload is logged and skipped, not crashed on. This ties back to Week 2's retry and defensive-parsing habits: never trust I/O, always handle the failure case.

### API Security & Auth
An open data API means anyone who knows the URL can read every reading from every device. Authentication (who are you?) comes before authorization (what can you do?). We use Bearer token auth: every request includes `Authorization: Bearer <token>`, and the server rejects missing/invalid tokens with 401. The token lives in an environment variable, never in committed code — if the token is in source, it's in git history forever. The dashboard stores the token in `localStorage` after the user enters it, and includes it in every API request. On a 401 response, the dashboard redirects to the login screen instead of silently failing. This is the difference between a prototype and something you could actually operate.

### Historical Analytics & Charts
Reading from a REST API (not MQTT, not the database directly) gives the dashboard a clean, authenticated, queryable interface. Time-series charts need data points with timestamps — the API returns `{device_id, temp, light, mode, ts}`, and the chart plots `ts` on the X-axis. A time-range filter (last hour / 24h / 7d) sends different `from` parameters to the API. A device selector lets you switch between multiple devices, each with their own data stream. The live view (MQTT) and history view (REST API) coexist: live shows what's happening now, history shows what happened before. This is the leap from a live monitor to a real IoT data platform.
