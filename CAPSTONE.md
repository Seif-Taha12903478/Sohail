# CAPSTONE — Final Reflection

## What "Done" Means for a Real Project

A project is done when it's deployed, documented, and reproducible by someone new. "Working on my machine" is not done — it means anyone else who clones the repo can follow the README, run the system, and see it work. Done means the architecture is communicated clearly enough that a stranger can understand the system in minutes, not hours. For our project, done means: the ESP32 runs on Wokwi (accessible via a link), the ingestion API is deployed and reachable, the dashboard is live on a public URL, and the database is provisioned. The README has run instructions, the PROTOCOL.md has every contract, and the INTEGRATION.md has test evidence. Done also means the git history tells a clear story of who did what and when.

## Architecture Communication

A good diagram plus a README lets a stranger understand a system in minutes. Our architecture is a linear chain: sensor → ESP32 → Wi-Fi → MQTT broker → ingestion service → database → secured REST API → dashboard. Each step is a separate component with a clear responsibility. The README explains what each component does, the PROTOCOL.md defines how they talk to each other, and the INTEGRATION.md proves they work together. We learned that a diagram is worth a thousand words of prose — the ASCII architecture diagram in our README communicates the entire system flow at a glance. The folder structure mirrors the architecture: `firmware/` for the device, `ingestion-api/` for the backend, `dashboard/` for the frontend. A new contributor can open any folder and understand its purpose without reading the others.

## Individual Accountability in Team Work

Commit history, branches, and PRs are the professional record of who did what. In a team project, the shared repo alone doesn't prove individual contribution — anyone could have written any line. The professional record is the git log: which branch did you work on, which PRs did you open, which commits are yours, and what did each commit deliver? We enforced this by working on separate branches (`seif/dashboard-comms` and `abijith/firmware-ingestion`), opening PRs for review, and requiring the other teammate to review before merge. This means every change has an author, a reviewer, and a merge record. The CONTRIBUTION.md file makes this explicit: each of us listed our branch, our PRs, our key commits with one-line descriptions, and an honest paragraph about what was ours and where we collaborated. Being able to defend every part you claim is the core of professional accountability — you should be able to explain not just what you built, but why you made the choices you made, and how it connects to your teammate's work.

## Final State

The platform is complete: a real end-to-end IoT system that goes from physical sensors on an ESP32, over Wi-Fi, through MQTT, into a database, through a secured API, and onto a live dashboard with historical charts and alerting. Two people built it in distinct layers over six weeks, with clear ownership, documented contracts, and tested integration at every milestone.
