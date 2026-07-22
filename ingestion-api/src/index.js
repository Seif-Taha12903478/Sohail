import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim());
const corsOptions = allowedOrigins.includes('*')
  ? {}
  : { origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error('Not allowed by CORS'));
    }};

app.use(cors(corsOptions));
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_TOKEN = process.env.API_TOKEN || 'iot-platform-demo-token';
const MQTT_BROKER = process.env.MQTT_BROKER || 'ws://broker.hivemq.com:8000/mqtt';
const TELEMETRY_TOPIC = 'device/telemetry';
const COMMAND_TOPIC = 'device/commands';
const alertCooldowns = new Map();

const VALID_OPERATORS = ['>', '<', '>=', '<=', '=='];
const VALID_SEVERITIES = ['info', 'warning', 'critical'];
const VALID_FIELDS = ['temp', 'light', 'mode'];

function sendError(res, status, message, details) {
  const body = { error: message };
  if (details) body.details = details;
  res.status(status).json(body);
}

const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 100;

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = requestCounts.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
  }
  entry.count++;
  requestCounts.set(ip, entry);
  if (entry.count > RATE_LIMIT_MAX) {
    return sendError(res, 429, 'Rate limit exceeded. Try again in a minute.');
  }
  next();
}

app.use(rateLimiter);

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return sendError(res, 401, 'Missing or invalid Authorization header. Expected: Bearer <token>');
  }
  if (auth.slice(7) !== API_TOKEN) {
    return sendError(res, 401, 'Invalid API token');
  }
  next();
}

function validateDeviceId(deviceId) {
  return typeof deviceId === 'string' && deviceId.length > 0 && deviceId.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(deviceId);
}

function validateThresholdInput(body) {
  const errors = [];
  if (!body.device_id || !validateDeviceId(body.device_id)) errors.push('device_id must be a non-empty alphanumeric string (max 100 chars)');
  if (!body.field || !VALID_FIELDS.includes(body.field)) errors.push(`field must be one of: ${VALID_FIELDS.join(', ')}`);
  if (!body.operator || !VALID_OPERATORS.includes(body.operator)) errors.push(`operator must be one of: ${VALID_OPERATORS.join(', ')}`);
  if (body.value === undefined || typeof body.value !== 'number') errors.push('value must be a number');
  if (!body.severity || !VALID_SEVERITIES.includes(body.severity)) errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  return errors;
}

async function ensureDevice(deviceId) {
  const { data } = await supabase.from('devices').select('device_id').eq('device_id', deviceId).maybeSingle();
  if (!data) {
    await supabase.from('devices').insert({ device_id: deviceId, name: deviceId, location: 'Wokwi Simulation' });
  }
}

async function evaluateAlerts(reading) {
  const { data: thresholds } = await supabase.from('thresholds').select('*').eq('device_id', reading.device_id).eq('enabled', true);
  if (!thresholds || thresholds.length === 0) return;
  for (const t of thresholds) {
    const fieldValue = reading[t.field];
    if (fieldValue === undefined) continue;
    let breached = false;
    switch (t.operator) {
      case '>': breached = fieldValue > t.value; break;
      case '<': breached = fieldValue < t.value; break;
      case '>=': breached = fieldValue >= t.value; break;
      case '<=': breached = fieldValue <= t.value; break;
      case '==': breached = fieldValue === t.value; break;
    }
    const cooldownKey = `${reading.device_id}:${t.field}:${t.operator}:${t.value}`;
    const now = Date.now();
    if (breached) {
      const lastFired = alertCooldowns.get(cooldownKey) || 0;
      if (now - lastFired > 30000) {
        alertCooldowns.set(cooldownKey, now);
        const message = `${t.field} ${t.operator} ${t.value} (current: ${fieldValue})`;
        await supabase.from('alerts').insert({
          device_id: reading.device_id, field: t.field, operator: t.operator,
          value: t.value, severity: t.severity, message, status: 'active', resolved: false
        });
        console.log(`ALERT [${t.severity}] ${reading.device_id}: ${message}`);
      }
    } else {
      alertCooldowns.delete(cooldownKey);
    }
  }
}

const mqttClient = mqtt.connect(MQTT_BROKER);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe(TELEMETRY_TOPIC, (err) => {
    if (err) console.error('Subscribe error:', err);
    else console.log(`Subscribed to ${TELEMETRY_TOPIC}`);
  });
});

mqttClient.on('message', async (topic, message) => {
  try {
    const reading = JSON.parse(message.toString());
    if (!reading.device_id || reading.temp === undefined || reading.light === undefined) {
      console.error('Malformed telemetry:', message.toString());
      return;
    }
    await ensureDevice(reading.device_id);
    const { error } = await supabase.from('readings').insert({
      device_id: reading.device_id, temp: reading.temp, light: reading.light, mode: reading.mode || 1
    });
    if (error) console.error('Insert error:', error.message);
    else console.log(`Stored reading from ${reading.device_id}: T=${reading.temp} L=${reading.light} MODE=${reading.mode}`);
    await evaluateAlerts(reading);
  } catch (err) {
    console.error('Telemetry processing error:', err.message);
  }
});

mqttClient.on('error', (err) => console.error('MQTT error:', err.message));
mqttClient.on('reconnect', () => console.log('Reconnecting to MQTT broker...'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', mqtt: mqttClient.connected ? 'connected' : 'disconnected' });
});

app.get('/devices', authMiddleware, async (req, res) => {
  const { data, error } = await supabase.from('devices').select('*').order('created_at', { ascending: true });
  if (error) return sendError(res, 500, 'Database error', error.message);
  res.json(data);
});

app.get('/readings', authMiddleware, async (req, res) => {
  const { device, from, to } = req.query;
  if (!device) return sendError(res, 400, 'device parameter required');
  if (!validateDeviceId(device)) return sendError(res, 400, 'Invalid device_id format');
  let query = supabase.from('readings').select('*').eq('device_id', device);
  if (from) query = query.gte('ts', from);
  if (to) query = query.lte('ts', to);
  query = query.order('ts', { ascending: false }).limit(1000);
  const { data, error } = await query;
  if (error) return sendError(res, 500, 'Database error', error.message);
  res.json(data);
});

app.get('/alerts', authMiddleware, async (req, res) => {
  const { device, from, to, status, severity } = req.query;
  let query = supabase.from('alerts').select('*');
  if (device) query = query.eq('device_id', device);
  if (from) query = query.gte('ts', from);
  if (to) query = query.lte('ts', to);
  if (status) query = query.eq('status', status);
  if (severity) query = query.eq('severity', severity);
  query = query.order('ts', { ascending: false }).limit(200);
  const { data, error } = await query;
  if (error) return sendError(res, 500, 'Database error', error.message);
  res.json(data);
});

app.get('/thresholds', authMiddleware, async (req, res) => {
  const { device } = req.query;
  let query = supabase.from('thresholds').select('*');
  if (device) query = query.eq('device_id', device);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) return sendError(res, 500, 'Database error', error.message);
  res.json(data);
});

app.post('/thresholds', authMiddleware, async (req, res) => {
  const errors = validateThresholdInput(req.body);
  if (errors.length > 0) return sendError(res, 400, 'Validation failed', errors);
  const { device_id, field, operator, value, severity } = req.body;
  const { data, error } = await supabase.from('thresholds').insert({
    device_id, field, operator, value, severity, enabled: true
  }).select().single();
  if (error) return sendError(res, 500, 'Database error', error.message);
  res.status(201).json(data);
});

app.delete('/thresholds/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('thresholds').delete().eq('id', req.params.id);
  if (error) return sendError(res, 500, 'Database error', error.message);
  res.status(204).send();
});

app.patch('/alerts/:id/ack', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('alerts').update({
    status: 'acknowledged', acknowledged_at: new Date().toISOString(), resolved: false
  }).eq('id', id).eq('status', 'active').select().single();
  if (error) return sendError(res, 500, 'Database error', error.message);
  if (!data) return sendError(res, 404, 'Alert not found or not in active state');
  res.json(data);
});

app.patch('/alerts/:id/resolve', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('alerts').update({
    status: 'resolved', resolved_at: new Date().toISOString(), resolved: true
  }).eq('id', id).in('status', ['active', 'acknowledged']).select().single();
  if (error) return sendError(res, 500, 'Database error', error.message);
  if (!data) return sendError(res, 404, 'Alert not found or already resolved');
  res.json(data);
});

app.get('/stats', authMiddleware, async (req, res) => {
  const { device } = req.query;
  if (!device) return sendError(res, 400, 'device parameter required');
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('readings')
    .select('temp, light')
    .eq('device_id', device)
    .gte('ts', from)
    .order('ts', { ascending: false })
    .limit(1000);
  if (error) return sendError(res, 500, 'Database error', error.message);
  if (!data || data.length === 0) return res.json({ count: 0, avgTemp: null, maxTemp: null, minTemp: null, avgLight: null, maxLight: null, minLight: null });
  const temps = data.map(r => r.temp).filter(t => t != null);
  const lights = data.map(r => r.light).filter(l => l != null);
  res.json({
    count: data.length,
    avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
    maxTemp: Math.max(...temps),
    minTemp: Math.min(...temps),
    avgLight: lights.reduce((a, b) => a + b, 0) / lights.length,
    maxLight: Math.max(...lights),
    minLight: Math.min(...lights),
  });
});

app.post('/command', authMiddleware, async (req, res) => {
  const { cmd, value } = req.body;
  if (!cmd || typeof cmd !== 'string' || !['MODE', 'RATE'].includes(cmd)) {
    return sendError(res, 400, 'cmd must be "MODE" or "RATE"');
  }
  if (value === undefined || typeof value !== 'number') {
    return sendError(res, 400, 'value must be a number');
  }
  if (cmd === 'MODE' && (value < 1 || value > 3)) {
    return sendError(res, 400, 'MODE value must be 1, 2, or 3');
  }
  if (cmd === 'RATE' && (value < 100 || value > 60000)) {
    return sendError(res, 400, 'RATE value must be between 100 and 60000');
  }
  const payload = JSON.stringify({ cmd, value });
  mqttClient.publish(COMMAND_TOPIC, payload);
  res.json({ status: 'sent', payload });
});

app.use((req, res) => sendError(res, 404, 'Endpoint not found'));

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  sendError(res, 500, 'Internal server error');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Ingestion API running on port ${PORT}`);
  console.log(`MQTT broker: ${MQTT_BROKER}`);
  console.log(`Rate limit: ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000}s`);
});
