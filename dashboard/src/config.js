export const config = {
  apiBase: import.meta.env.VITE_API_BASE || 'http://localhost:3001',
  mqttBroker: 'ws://broker.hivemq.com:8000/mqtt',
  telemetryTopic: 'device/telemetry',
  commandTopic: 'device/commands',
};

export const MODE_NAMES = { 1: 'Normal', 2: 'Fast', 3: 'Standby' };

export const TIME_RANGES = [
  { key: '1h', label: 'Last Hour', ms: 3_600_000 },
  { key: '24h', label: 'Last 24h', ms: 86_400_000 },
  { key: '7d', label: 'Last 7 Days', ms: 604_800_000 },
];

export const SEVERITY_ORDER = ['critical', 'warning', 'info'];

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(ts) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
