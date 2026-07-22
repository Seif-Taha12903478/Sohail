import { useState, useEffect, useCallback, useMemo } from 'react';
import { config, TIME_RANGES } from './config.js';
import { getToken, clearToken, apiGet } from './lib/api.js';
import { useMqtt } from './hooks/useMqtt.js';
import { useApiData } from './hooks/useApiData.js';
import { computeStats } from './lib/stats.js';
import { LoginScreen } from './components/LoginScreen.jsx';
import { MetricCards, DeviceControl, LiveLog } from './components/LiveView.jsx';
import { HistoryView } from './components/HistoryView.jsx';
import { AlertsView } from './components/AlertsView.jsx';
import './styles.css';

export default function App() {
  const [token, setToken] = useState(getToken);
  const [authFailed, setAuthFailed] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [tab, setTab] = useState('live');
  const [selectedDevice, setSelectedDevice] = useState('');
  const [historyData, setHistoryData] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedMode, setSelectedMode] = useState(1);
  const [rateInput, setRateInput] = useState('1000');
  const [latestReadings, setLatestReadings] = useState(new Map());
  const [liveLog, setLiveLog] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const api = useApiData(token, authFailed);

  const handleMqttMessage = useCallback((reading) => {
    if (!reading.device_id) return;
    setLatestReadings(prev => { const next = new Map(prev); next.set(reading.device_id, reading); return next; });
    setLiveLog(prev => [{ ...reading, receivedAt: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const { connected, sendCommand } = useMqtt(handleMqttMessage);

  // Online/offline detection
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Load devices on login
  useEffect(() => {
    if (!token || authFailed) return;
    api.fetchDevices().then(data => {
      if (data && data.length > 0 && !selectedDevice) setSelectedDevice(data[0].device_id);
    });
  }, [token, authFailed]);

  // Poll alerts every 10s
  useEffect(() => {
    if (!token || authFailed) return;
    api.fetchAlerts();
    const interval = setInterval(() => api.fetchAlerts(), 10000);
    return () => clearInterval(interval);
  }, [token, authFailed]);

  // Fetch history when device or time range changes
  useEffect(() => {
    if (!token || authFailed || !selectedDevice) return;
    setLoadingHistory(true);
    const range = TIME_RANGES.find(r => r.key === timeRange);
    api.fetchHistory(selectedDevice, range?.ms || 3_600_000)
      .then(data => {
        const sorted = [...(data || [])].reverse();
        setHistoryData(sorted);
      })
      .finally(() => setLoadingHistory(false));
  }, [token, authFailed, selectedDevice, timeRange]);

  const handleLogin = useCallback((t, devices) => {
    setToken(t);
    setAuthFailed(false);
    api.setDevices?.(devices);
    if (devices.length > 0) setSelectedDevice(devices[0].device_id);
  }, []);

  const handleLogout = () => {
    clearToken();
    setToken('');
    setAuthFailed(false);
  };

  const handleModeChange = (mode) => { setSelectedMode(mode); sendCommand('MODE', mode); };
  const handleRateChange = () => {
    const rate = parseInt(rateInput, 10);
    if (rate >= 100 && rate <= 60000) sendCommand('RATE', rate);
  };

  // Retry with exponential backoff
  const handleRetry = useCallback(() => {
    api.retry();
    api.fetchDevices();
    api.fetchAlerts();
  }, [api]);

  if (!token || authFailed) {
    return <LoginScreen onLogin={handleLogin} error={loginError} setError={setLoginError} />;
  }

  const latestReading = selectedDevice ? latestReadings.get(selectedDevice) : null;
  const activeAlerts = api.alerts.filter(a => (a.status || (a.resolved ? 'resolved' : 'active')) === 'active');

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
          <span className={`health-badge ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <button className="btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {api.apiError && !authFailed && (
        <div className="error-banner">
          <span>API Error: {api.apiError}</span>
          <button className="btn-sm" onClick={handleRetry}>Retry</button>
        </div>
      )}

      {!isOnline && (
        <div className="offline-banner">
          You are offline. Showing cached data. Changes may not sync until reconnected.
        </div>
      )}

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
                {api.devices.map(d => <option key={d.device_id} value={d.device_id}>{d.device_id}</option>)}
              </select>
            </div>
          </div>
          <MetricCards latestReading={latestReading} />
          <DeviceControl selectedMode={selectedMode} onModeChange={handleModeChange}
            rateInput={rateInput} setRateInput={setRateInput} onRateChange={handleRateChange} />
          <LiveLog liveLog={liveLog} selectedDevice={selectedDevice} />
        </div>
      )}

      {tab === 'history' && (
        <HistoryView historyData={historyData} loadingHistory={loadingHistory}
          selectedDevice={selectedDevice} devices={api.devices}
          onSelectDevice={setSelectedDevice} timeRange={timeRange}
          onTimeRangeChange={setTimeRange} connected={connected} />
      )}

      {tab === 'alerts' && (
        <AlertsView alerts={api.alerts} loadingAlerts={api.loadingAlerts}
          token={token} onAlertUpdated={() => api.fetchAlerts()} />
      )}
    </div>
  );
}
