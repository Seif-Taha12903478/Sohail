import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const API_TOKEN = process.env.API_TOKEN || 'iot-platform-demo-token';
const MQTT_BROKER = process.env.MQTT_BROKER || 'ws://broker.hivemq.com:8000/mqtt';
const TELEMETRY_TOPIC = 'device/telemetry';
const COMMAND_TOPIC = 'device/commands';
const alertCooldowns = new Map();

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header. Expected: Bearer <token>' });
  }
  if (auth.slice(7) !== API_TOKEN) {
    return res.status(401).json({ error: 'Invalid API token' });
  }
  next();
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
          value: t.value, severity: t.severity, message, resolved: false
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
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/readings', authMiddleware, async (req, res) => {
  const { device, from, to } = req.query;
  if (!device) return res.status(400).json({ error: 'device parameter required' });
  let query = supabase.from('readings').select('*').eq('device_id', device);
  if (from) query = query.gte('ts', from);
  if (to) query = query.lte('ts', to);
  query = query.order('ts', { ascending: false }).limit(1000);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/alerts', authMiddleware, async (req, res) => {
  const { device, from, to } = req.query;
  let query = supabase.from('alerts').select('*');
  if (device) query = query.eq('device_id', device);
  if (from) query = query.gte('ts', from);
  if (to) query = query.lte('ts', to);
  query = query.order('ts', { ascending: false }).limit(200);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/thresholds', authMiddleware, async (req, res) => {
  const { device } = req.query;
  let query = supabase.from('thresholds').select('*');
  if (device) query = query.eq('device_id', device);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/thresholds', authMiddleware, async (req, res) => {
  const { device_id, field, operator, value, severity } = req.body;
  if (!device_id || !field || !operator || value === undefined || !severity) {
    return res.status(400).json({ error: 'Missing required fields: device_id, field, operator, value, severity' });
  }
  const { data, error } = await supabase.from('thresholds').insert({
    device_id, field, operator, value, severity, enabled: true
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete('/thresholds/:id', authMiddleware, async (req, res) => {
  const { error } = await supabase.from('thresholds').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.status(204).send();
});

app.post('/command', authMiddleware, async (req, res) => {
  const { cmd, value } = req.body;
  if (!cmd || value === undefined) return res.status(400).json({ error: 'Missing cmd or value' });
  const payload = JSON.stringify({ cmd, value });
  mqttClient.publish(COMMAND_TOPIC, payload);
  res.json({ status: 'sent', payload });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Ingestion API running on port ${PORT}`);
  console.log(`MQTT broker: ${MQTT_BROKER}`);
  console.log(`API token required: Bearer <token>`);
});
