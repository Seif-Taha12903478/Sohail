import { useState, useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import './styles.css';

const MQTT_BROKER = 'ws://broker.hivemq.com:8000/mqtt';
const TELEMETRY_TOPIC = 'device/telemetry';
const COMMAND_TOPIC = 'device/commands';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const MODE_NAMES = { 1: 'Normal', 2: 'Fast', 3: 'Standby' };

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function formatDateTime(ts) {
  return new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('api_token') || '');
  const [tokenInput, setTokenInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [authFailed, setAuthFailed] = useState(false);
  const [tab, setTab] = useState('live');
  const [connected, setConnected] = useState(false);
  const [latestReadings, setLatestReadings] = useState(new Map());
  const [liveLog, setLiveLog] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [selectedMode, setSelectedMode] = useState(1);
  const [rateInput, setRateInput] = useState('1000');
  const clientRef = useRef(null);

  const authHeaders = useCallback(() => ({
    'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'
  }), [token]);

  const apiGet = useCallback(async (path) => {
    const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
    if (res.status === 401) { setAuthFailed(true); throw new Error('Unauthorized'); }
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  }, [authHeaders]);

  useEffect(() => {
    if (!token || authFailed) return;
    apiGet('/devices').then(data => {
      setDevices(data || []);
      if (data && data.length > 0 && !selectedDevice) setSelectedDevice(data[0].device_id);
    }).catch(err => console.error('Failed to load devices:', err.message));
  }, [token, authFailed]);

  useEffect(() => {
    if (!token || authFailed) return;
    setLoadingAlerts(true);
    apiGet('/alerts').then(data => setAlerts(data || []))
      .catch(err => console.error('Failed to load alerts:', err.message))
      .finally(() => setLoadingAlerts(false));
    const interval = setInterval(() => {
      apiGet('/alerts').then(data => setAlerts(data || [])).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [token, authFailed]);

  useEffect(() => {
    if (!token || authFailed) return;
    const client = mqtt.connect(MQTT_BROKER);
    clientRef.current = client;
    client.on('connect', () => { setConnected(true); client.subscribe(TELEMETRY_TOPIC); });
    client.on('message', (topic, message) => {
      try {
        const reading = JSON.parse(message.toString());
        if (!reading.device_id) return;
        setLatestReadings(prev => { const next = new Map(prev); next.set(reading.device_id, reading); return next; });
        setLiveLog(prev => { const entry = { ...reading, receivedAt: Date.now() }; return [entry, ...prev].slice(0, 50); });
      } catch (err) { console.error('Malformed telemetry:', err.message); }
    });
    client.on('error', (err) => console.error('MQTT error:', err.message));
    client.on('reconnect', () => setConnected(false));
    client.on('close', () => setConnected(false));
    return () => { client.end(true); };
  }, [token, authFailed]);

  useEffect(() => {
    if (!token || authFailed || !selectedDevice) return;
    setLoadingHistory(true);
    const now = Date.now();
    const ranges = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
    const from = new Date(now - (ranges[timeRange] || 3600000)).toISOString();
    apiGet(`/readings?device=${encodeURIComponent(selectedDevice)}&from=${encodeURIComponent(from)}`)
      .then(data => {
        const sorted = [...(data || [])].reverse();
        setHistoryData(sorted.map(r => ({ ...r, time: formatTime(r.ts) })));
      })
      .catch(err => console.error('Failed to load history:', err.message))
      .finally(() => setLoadingHistory(false));
  }, [token, authFailed, selectedDevice, timeRange]);

  const sendCommand = (cmd, value) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    clientRef.current.publish(COMMAND_TOPIC, JSON.stringify({ cmd, value }));
  };

  const handleModeChange = (mode) => { setSelectedMode(mode); sendCommand('MODE', mode); };
  const handleRateChange = () => {
    const rate = parseInt(rateInput, 10);
    if (rate >= 100 && rate <= 60000) sendCommand('RATE', rate);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) { setLoginError('Please enter an API token'); return; }
    setLoginError(''); setAuthFailed(false);
    fetch(`${API_BASE}/devices`, { headers: { 'Authorization': `Bearer ${tokenInput.trim()}` } })
      .then(res => {
        if (res.status === 401) { setLoginError('Invalid token. Check with your team for the API token.'); return; }
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const t = tokenInput.trim();
        setToken(t); localStorage.setItem('api_token', t);
        setDevices(data || []);
        if (data && data.length > 0) setSelectedDevice(data[0].device_id);
      })
      .catch(err => setLoginError(`Connection failed: ${err.message}`));
  };

  const handleLogout = () => {
    localStorage.removeItem('api_token'); setToken(''); setTokenInput(''); setAuthFailed(false);
  };

  if (!token || authFailed) {
    return (
      <div className="app">
        <div className="login-screen">
          <div className="login-card">
            <h2>IoT Dashboard Login</h2>
            <p>Enter the API token to access telemetry, history, and alerts.</p>
            {loginError && <div className="login-error">{loginError}</div>}
            <form onSubmit={handleLogin}>
              <input className="input" type="password" placeholder="API Token" value={tokenInput}
                onChange={e => setTokenInput(e.target.value)} />
              <button className="btn primary" type="submit">Login</button>
            </form>
            <p style={{ marginTop: '16px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Demo token: iot-platform-demo-token
            </p>
          </div>
        </div>
      </div>
    );
  }

  const latestReading = selectedDevice ? latestReadings.get(selectedDevice) : null;
  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="app">
      <div className="header">
        <div>
          <h1>IoT <span>Environmental Monitoring</span></h1>
          <div className="subtitle">Sensor to ESP32 to MQTT to Ingestion to Database to Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="connection-badge">
            <div className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} />
            {connected ? 'Live' : 'Disconnected'}
          </div>
          <button className="btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'live' ? 'active' : ''}`} onClick={() => setTab('live')}>Live View</button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>History and Charts</button>
        <button className={`tab ${tab === 'alerts' ? 'active' : ''}`} onClick={() => setTab('alerts')}>Alerts ({activeAlerts.length})</button>
      </div>

      {tab === 'live' && (
        <div className="fade-in">
          <div className="controls-row">
            <div className="controls">
              <span className="label">Device:</span>
              <select className="select" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
                {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.device_id}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-3">
            <div className="metric-card">
              <div className="metric-label">Temperature</div>
              <div className="metric-value temp">{latestReading ? latestReading.temp.toFixed(1) : '--'}<span className="metric-unit"> C</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Light</div>
              <div className="metric-value light">{latestReading ? latestReading.light : '--'}<span className="metric-unit"> lx</span></div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Mode</div>
              <div className="metric-value mode">{latestReading ? MODE_NAMES[latestReading.mode] || `Mode ${latestReading.mode}` : '--'}</div>
            </div>
          </div>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>Device Control</h2>
            <div className="controls" style={{ marginTop: '12px' }}>
              <span className="label">Mode:</span>
              {[1, 2, 3].map(m => (
                <button key={m} className={`btn ${selectedMode === m ? 'active-mode' : ''}`} onClick={() => handleModeChange(m)}>{MODE_NAMES[m]}</button>
              ))}
              <span className="label" style={{ marginLeft: '16px' }}>Rate (ms):</span>
              <input className="input" type="number" value={rateInput} onChange={e => setRateInput(e.target.value)} min="100" max="60000" />
              <button className="btn" onClick={handleRateChange}>Set Rate</button>
            </div>
          </div>
          <div className="card">
            <h2>Live Telemetry Log</h2>
            {liveLog.length === 0 ? (
              <div className="empty-state"><p>Waiting for telemetry messages...</p></div>
            ) : (
              <table className="live-table">
                <thead><tr><th>Device</th><th>Temp (C)</th><th>Light (lx)</th><th>Mode</th><th>Time</th></tr></thead>
                <tbody>
                  {liveLog.filter(r => !selectedDevice || r.device_id === selectedDevice).map((r, i) => (
                    <tr key={i}><td>{r.device_id}</td><td>{r.temp?.toFixed(1)}</td><td>{r.light}</td>
                      <td>{MODE_NAMES[r.mode] || r.mode}</td><td>{formatTime(r.receivedAt)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="fade-in">
          <div className="controls-row">
            <div className="controls">
              <span className="label">Device:</span>
              <select className="select" value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}>
                {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.device_id}</option>)}
              </select>
            </div>
            <div className="range-buttons">
              {[{ key: '1h', label: 'Last Hour' }, { key: '24h', label: 'Last 24h' }, { key: '7d', label: 'Last 7 Days' }].map(r => (
                <button key={r.key} className={`range-btn ${timeRange === r.key ? 'active' : ''}`} onClick={() => setTimeRange(r.key)}>{r.label}</button>
              ))}
            </div>
          </div>
          {loadingHistory ? (
            <div className="loading">Loading historical data...</div>
          ) : historyData.length === 0 ? (
            <div className="empty-state"><p>No historical data for this device and time range.</p></div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: '20px' }}>
                <h2>Temperature Over Time</h2>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} dot={false} name="Temp (C)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <h2>Light Level Over Time</h2>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                      <Line type="monotone" dataKey="light" stroke="#06b6d4" strokeWidth={2} dot={false} name="Light (lx)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'alerts' && (
        <div className="fade-in">
          <div className="card">
            <div className="section-title"><h2>Active Alerts ({activeAlerts.length})</h2></div>
            {loadingAlerts ? (
              <div className="loading">Loading alerts...</div>
            ) : activeAlerts.length === 0 ? (
              <div className="empty-state"><p>No active alerts. All clear.</p></div>
            ) : (
              activeAlerts.map(a => (
                <div key={a.id} className={`alert-item ${a.severity}`}>
                  <span className={`alert-severity ${a.severity}`}>{a.severity}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{a.device_id}</div>
                    <div className="alert-message">{a.message}</div>
                  </div>
                  <span className="alert-time">{formatDateTime(a.ts)}</span>
                </div>
              ))
            )}
          </div>
          <div className="card" style={{ marginTop: '20px' }}>
            <h2>Alert History (All)</h2>
            {alerts.length === 0 ? (
              <div className="empty-state"><p>No alerts recorded.</p></div>
            ) : (
              alerts.slice(0, 50).map(a => (
                <div key={a.id} className={`alert-item ${a.severity}`} style={{ opacity: a.resolved ? 0.5 : 1 }}>
                  <span className={`alert-severity ${a.severity}`}>{a.severity}</span>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>{a.device_id}</div>
                    <div className="alert-message">{a.message}</div>
                  </div>
                  <span className="alert-time">{formatDateTime(a.ts)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
