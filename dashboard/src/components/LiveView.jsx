import { MODE_NAMES } from '../config.js';

export function StatsPanel({ stats, latestReading, connected }) {
  const fmt = (v, unit = '') => v != null ? `${typeof v === 'number' ? v.toFixed(1) : v}${unit}` : '--';

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <h2>Statistics</h2>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Avg Temperature</div>
          <div className="stat-value temp">{fmt(stats.avgTemp, ' C')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Max Temperature</div>
          <div className="stat-value temp">{fmt(stats.maxTemp, ' C')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Min Temperature</div>
          <div className="stat-value temp">{fmt(stats.minTemp, ' C')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Avg Light</div>
          <div className="stat-value light">{fmt(stats.avgLight, ' lx')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Max Light</div>
          <div className="stat-value light">{fmt(stats.maxLight, ' lx')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Min Light</div>
          <div className="stat-value light">{fmt(stats.minLight, ' lx')}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Total Readings</div>
          <div className="stat-value">{stats.count}</div>
        </div>
        <div className="stat-item">
          <div className="stat-label">Device Health</div>
          <div className="stat-value">
            <span className={`health-badge ${connected ? 'online' : 'offline'}`}>
              {connected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetricCards({ latestReading }) {
  return (
    <div className="grid-3">
      <div className="metric-card">
        <div className="metric-label">Temperature</div>
        <div className="metric-value temp">
          {latestReading ? latestReading.temp.toFixed(1) : '--'}<span className="metric-unit"> C</span>
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Light</div>
        <div className="metric-value light">
          {latestReading ? latestReading.light : '--'}<span className="metric-unit"> lx</span>
        </div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Mode</div>
        <div className="metric-value mode">
          {latestReading ? MODE_NAMES[latestReading.mode] || `Mode ${latestReading.mode}` : '--'}
        </div>
      </div>
    </div>
  );
}

export function DeviceControl({ selectedMode, onModeChange, rateInput, setRateInput, onRateChange }) {
  return (
    <div className="card" style={{ marginBottom: '24px' }}>
      <h2>Device Control</h2>
      <div className="controls" style={{ marginTop: '12px' }}>
        <span className="label">Mode:</span>
        {[1, 2, 3].map(m => (
          <button key={m} className={`btn ${selectedMode === m ? 'active-mode' : ''}`} onClick={() => onModeChange(m)}>
            {MODE_NAMES[m]}
          </button>
        ))}
        <span className="label" style={{ marginLeft: '16px' }}>Rate (ms):</span>
        <input className="input" type="number" value={rateInput} onChange={e => setRateInput(e.target.value)} min="100" max="60000" />
        <button className="btn" onClick={onRateChange}>Set Rate</button>
      </div>
    </div>
  );
}

export function LiveLog({ liveLog, selectedDevice }) {
  return (
    <div className="card">
      <h2>Live Telemetry Log</h2>
      {liveLog.length === 0 ? (
        <div className="empty-state"><p>Waiting for telemetry messages...</p></div>
      ) : (
        <table className="live-table">
          <thead><tr><th>Device</th><th>Temp (C)</th><th>Light (lx)</th><th>Mode</th><th>Time</th></tr></thead>
          <tbody>
            {liveLog.filter(r => !selectedDevice || r.device_id === selectedDevice).map((r, i) => (
              <tr key={i}>
                <td>{r.device_id}</td>
                <td>{r.temp?.toFixed(1)}</td>
                <td>{r.light}</td>
                <td>{MODE_NAMES[r.mode] || r.mode}</td>
                <td>{new Date(r.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
