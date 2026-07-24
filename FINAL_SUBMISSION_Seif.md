# Final Submission — Seif Taha
**ENGR 390 Internship | American University of Ras Al Khaimah | Summer 2026**
**Repository:** https://github.com/Seif-Taha12903478/Sohail

---

## Part 1 — The Full Journey

The internship ran eight weeks and covered the full arc of building a production IoT system from scratch. Weeks 1 and 2 were grounding weeks — understanding microcontroller timing with `millis()`, framing ASCII telemetry, and learning why `delay()` is an anti-pattern in embedded systems. The hardware felt self-contained and controllable. I was comfortable.

The first real shift came in **Week 4**, when we moved from Serial to MQTT over Wi-Fi. I had assumed "sending data over a network" was just Serial with a longer wire. It wasn't. MQTT is a broker model — the publisher and subscriber never talk directly, and neither side knows whether the other is listening. Understanding that decoupling changed how I thought about every layer of the system. The firmware didn't need to know a dashboard existed. The dashboard didn't need to know how many devices were publishing. Each layer could evolve independently.

The second shift came in **Week 6**, when I integrated live MQTT data with historical REST API data inside the same Chart.js canvas. Live WebSocket packets were arriving while a large async API response was still in flight. The chart crashed — a classic race condition. Solving it with state flags (blocking chart appends until the historical load finished) taught me that async code is not just about syntax; it is about reasoning carefully about time and ordering. That lesson applies everywhere.

The skill I am proudest of is the **full analytics pipeline** I built: async REST fetching, time-range filtering, moving-average overlays, and live MQTT injection into an already-rendered chart — all without freezing the UI. It is the piece that turns raw sensor numbers into something a non-technical operator can actually use.

---

## Part 2 — Your Role in the Team

I owned the **frontend, analytics, and client-side security layer** across all team projects. Concretely: the React/JS dashboard, the Chart.js historical charts, the MQTT WebSocket integration in the browser, the Bearer token auth flow, the active-alerts UI panel, and the Vercel deployment. Abijith owned the ESP32 firmware, the Node.js ingestion service, the Supabase schema, and the alert rule engine.

Collaboration on a shared codebase taught me that the hardest problem is not writing code — it is agreeing on the shape of the data at the boundary between two people's work. The `PROTOCOL.md` contract we wrote became the single source of truth. When I expected `ts` as an ISO string and Abijith was inserting a Unix epoch, neither of us was wrong until we compared outputs. Writing the contract first would have saved that integration day.

Abijith taught me the importance of **debouncing on the backend**. I had assumed alerting was straightforward — read the value, check the threshold, fire if breached. Watching him handle hysteresis and per-key cooldowns showed me that without it, a single threshold breach would generate hundreds of alerts per hour. That discipline of thinking about what happens at volume, not just in a single case, now influences how I write any event-driven code.

What I contributed that the project depended on: the **authenticated dual-stream dashboard**. Without the frontend consuming the secured REST API and the live MQTT feed simultaneously, the platform had no user-facing interface. The data existed in the database but was invisible. My layer was the only thing that made it observable.

---

## Part 3 — Technical Growth

The most valuable technical concept from the entire internship is **layered decoupling** — the principle that each component in a system should communicate through a defined contract and remain ignorant of what is on the other side. The ESP32 publishes JSON to an MQTT topic and does not know a database exists. The ingestion service subscribes and writes to Supabase without knowing a dashboard exists. The REST API exposes structured endpoints without knowing whether a React app or a Python script is calling them. This is not an academic principle; it is how real systems stay maintainable. When Abijith changed the alert severity logic, my alerts panel required zero changes because the API contract stayed the same.

The hardest problem I solved was the **CORS failure at deployment**. The platform worked perfectly on localhost. The moment both services went live — dashboard on Vercel, API on Render — every data request was blocked by the browser with a CORS policy error. The error message pointed at the browser, but the fix lived on the server. I had to trace exactly why: the browser performs a preflight OPTIONS request before any cross-origin fetch, and the Render API was returning no CORS headers on those OPTIONS responses. I worked with Abijith to add explicit `Access-Control-Allow-Origin`, `Allow-Methods`, and `Allow-Headers` headers to the Express middleware, whitelisting the Vercel domain. That fix taught me that deployment is not just "run in a different place" — network topology and browser security policies create entirely new failure modes that never appear in local development.

---

## Part 4 — Handover Package

**Repository:** https://github.com/Seif-Taha12903478/Sohail
My contributions are identifiable in the commit history (commits `6b4d67c`, `a072e65`, `6764fb1`, `09359f7`) and in `CONTRIBUTION_Seif.md` in the repository root.

**Contribution evidence:** `CONTRIBUTION_Seif.md` maps every module I own with the relevant file paths and a walkthrough of the five major deliverables (analytics dashboard, MQTT integration, token auth, alerts panel, Vercel deployment).

**Config and credentials (no secrets committed):**
- `dashboard/.env.example` documents every required environment variable: `VITE_API_URL` (the Render backend URL) and `VITE_API_TOKEN` (the Bearer token).
- `ingestion-api/.env.example` documents `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MQTT_BROKER_URL`, and `PORT`.
- No secrets are committed to the repository. All values are injected at runtime via environment variables on Vercel and Render respectively.
- A new developer can clone the repo, copy both `.env.example` files to `.env`, fill in the values from the Supabase project dashboard and the Render service settings, and run `npm install && npm run dev` in the `dashboard/` folder to have a working local instance immediately.

---

## Part 5 — Self Assessment

| Area | Score | Justification |
|---|---|---|
| **Technical Skills** | 8/10 | Built a working, deployed, authenticated full-stack IoT platform end-to-end. Deducted two points because my understanding of backend Node.js patterns and database indexing is still surface-level — I consumed the API but did not design the schema or write the ingestion logic. |
| **Communication & Coordination** | 7/10 | The PROTOCOL.md contract and regular integration syncs with Abijith worked well. Lost one point for the Week 6 integration day caused by an undocumented timestamp format change that a tighter communication habit would have caught earlier. |
| **Documentation** | 9/10 | Delivered PROTOCOL.md, CONTRIBUTION_Seif.md, LEARNING_Seif.md, the README screenshots table, and this final submission. All documentation is accurate and traceable to real commits and real code paths. |
| **Time Management** | 7/10 | Hit every weekly milestone. However, the CORS debugging and the async race condition each consumed a full day more than estimated. Better upfront research on deployment networking would have recovered that time. |
| **Professional Growth** | 8/10 | Entered the internship knowing embedded C basics. Leaving with a deployed, production-secured React dashboard, a working MQTT integration, and a genuine understanding of cloud deployment tradeoffs is a significant step. Still developing the instinct to anticipate distributed-system failure modes before hitting them. |

---

## Part 6 — Forward Look

These skills point directly toward **cloud-connected systems engineering** — the intersection of hardware data, backend services, and user interfaces. The next natural step is to go deeper on the backend side: understanding database query optimization for time-series data at scale, building proper API rate limiting and authentication with JWTs rather than static tokens, and exploring message queues like Kafka for higher-throughput IoT pipelines.

If the internship continued, the area I would keep developing is **automated end-to-end testing of the full data pipeline**. The 38 unit tests we wrote (23 frontend, 15 backend) validate individual functions in isolation. What we lacked is a single test that starts the Wokwi simulation, waits for a reading to land in Supabase, queries the REST API, and asserts the value matches. That class of integration testing — testing the seams between layers, not just the layers themselves — is where production systems actually fail, and it is the gap I most want to close next.
