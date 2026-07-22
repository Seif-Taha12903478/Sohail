# CAPSTONE — Final Reflection

**Author:** Seif Elwalid Elsenousy Taha
**Role:** Dashboard, Analytics & API Security
**Institution:** American University of Ras Al Khaimah (AURAK)
**Company:** Sohail Smart Solutions
**Date:** July 24, 2026

---

## What "Done" Means for a Real Project

In a professional environment, code that only runs on a local machine is incomplete. "Done" means three things: the application is deployed to a live, reliable environment where anyone can access it without the developer present; it is properly secured via environment variables rather than hardcoded secrets; and it is thoroughly documented so that a new developer could clone the repository and reproduce the setup without friction.

For this project, done means: the ESP32 runs on Wokwi (accessible via a public link), the ingestion API is deployed and reachable, the dashboard is live on a public URL, and the database is provisioned. The README has run instructions, the PROTOCOL.md defines every contract, the INTEGRATION.md has test evidence, and the screenshots folder has visual proof of every feature working. Done also means the git history tells a clear story of who did what and when — each commit has a descriptive message, and the CONTRIBUTION.md maps specific commits to specific features.

One lesson from this project: done also means tested. We added 38 automated tests (23 frontend, 15 backend) that verify the core logic — stats computations, API client behavior, input validation, and alert lifecycle states. A feature isn't done if it has no tests proving it works.

---

## Architecture Communication

A system is only as good as its documentation. A clear architecture diagram combined with a structured README acts as a map for strangers — it allows stakeholders and other engineers to understand the data flow in minutes rather than forcing them to reverse-engineer thousands of lines of code.

Our architecture is a linear chain: sensor → ESP32 → Wi-Fi → MQTT broker → ingestion service → database → secured REST API → dashboard. Each step is a separate component with a clear responsibility. The ASCII diagram in our README communicates this flow at a glance. The folder structure mirrors the architecture: `firmware/` for the device, `ingestion-api/` for the backend, `dashboard/` for the frontend. A new contributor can open any folder and understand its purpose without reading the others.

The PROTOCOL.md document defines every interface between these components — UART frame format, MQTT topic names and JSON payloads, REST API endpoints with request/response shapes, the auth scheme, and alert threshold configuration. This means a developer working on one layer never has to guess what the other layer expects.

---

## Individual Accountability in Team Work

Git history is the professional ledger of an engineer's contributions. While teamwork is essential for connecting the moving parts, commit logs, branches, and Pull Requests prove exactly who built the authentication logic versus who built the hardware ingestion. An engineer must be able to stand by and defend their specific commits because that code represents their technical integrity and problem-solving ability.

In our project, we worked on separate layers with a clear ownership boundary: Abijith owned firmware + ingestion + alert engine, I owned dashboard + analytics + auth + testing. Every commit in the git log has an author and a descriptive message. The CONTRIBUTION.md file makes this explicit — it lists specific commit hashes with one-line descriptions of what each delivered, and an honest paragraph about what was genuinely mine versus where we collaborated.

Being able to defend every part you claim is the core of professional accountability. You should be able to explain not just what you built, but why you made the choices you made, and how it connects to your teammate's work.

---

## Lessons Learned

**Managing async state:** A major takeaway was managing asynchronous state between live WebSocket telemetry and historical REST API data. The dashboard receives real-time readings via MQTT while simultaneously fetching historical data via REST. Ensuring the UI didn't break while awaiting token validation taught me the importance of robust error handling — loading states, error banners with retry, and offline detection.

**Modularization matters:** The initial dashboard was a single 340-line App.jsx. When it grew to include statistics, alert lifecycle management, CSV export, and moving averages, it became unmaintainable. I refactored it into a modular structure: `config.js` for centralized configuration, `hooks/` for reusable React hooks (useMqtt, useApiData), `components/` for view-level components (LiveView, HistoryView, AlertsView, LoginScreen), and `lib/` for pure utilities (api client, stats computations). This made each piece testable in isolation and dramatically improved maintainability.

**Alert lifecycle design:** The original alert system had a simple boolean `resolved` flag. This was insufficient — in a real operations context, an alert goes through multiple states: ACTIVE (fired, needs attention) → ACKNOWLEDGED (someone saw it, working on it) → RESOLVED (issue fixed). I designed a three-state lifecycle with database migration (adding `status`, `acknowledged_at`, `resolved_at` columns) and corresponding API endpoints (`PATCH /alerts/:id/ack`, `PATCH /alerts/:id/resolve`).

**Testing discipline:** Writing tests retroactively is harder than writing them alongside the feature, but it forced me to think about edge cases: what happens with empty arrays, null values, invalid tokens, malformed input. The 38 tests don't cover everything, but they cover the core logic that would break silently if changed.

---

## Current Limitations & Future Work

- **Public MQTT broker:** The current architecture uses HiveMQ's public broker, which introduces potential latency and security considerations. Future iterations would benefit from a private, TLS-secured MQTT broker.
- **Token auth vs JWT:** The current Bearer token is a single static API key. A production system would use short-lived JWTs with refresh tokens, token expiration, and role-based authorization.
- **No notification channels:** Alerts are only visible on the dashboard. A production system would send notifications via email, Telegram, Discord, or SMS.
- **No queue:** The ingestion API writes directly to the database. A production architecture would use a message queue (e.g., Redis, RabbitMQ) between ingestion and database for better throughput and resilience.
- **Deployment:** The platform runs locally and on Wokwi. Full deployment to Vercel (dashboard) + Render (API) + Supabase (database) is the next step to make it publicly accessible.
