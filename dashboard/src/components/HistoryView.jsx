import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { TIME_RANGES, formatTime } from '../config.js';
import { computeStats, movingAverage, exportToCsv } from '../lib/stats.js';
import { StatsPanel } from './LiveView.jsx';

export function HistoryView({ historyData, loadingHistory, selectedDevice, devices, onSelectDevice, timeRange, onTimeRangeChange, connected }) {
  const [showMovingAvg, setShowMovingAvg] = useState(false);
  const [showMinMax, setShowMinMax] = useState(false);

  const stats = useMemo(() => computeStats(historyData), [historyData]);
  const tempMA = useMemo(() => movingAverage(historyData, 'temp', 5), [historyData]);
  const lightMA = useMemo(() => movingAverage(historyData, 'light', 5), [historyData]);

  const chartData = useMemo(() => {
    return historyData.map((r, i) => ({
      ...r,
      time: formatTime(r.ts),
      tempMA: showMovingAvg ? tempMA[i] : undefined,
      lightMA: showMovingAvg ? lightMA[i] : undefined,
    }));
  }, [historyData, tempMA, lightMA, showMovingAvg]);

  const handleExport = () => {
    exportToCsv(historyData, `${selectedDevice}_readings_${timeRange}.csv`);
  };

  return (
    <div className="fade-in">
      <div className="controls-row">
        <div className="controls">
          <span className="label">Device:</span>
          <select className="select" value={selectedDevice} onChange={e => onSelectDevice(e.target.value)}>
            {devices.map(d => <option key={d.device_id} value={d.device_id}>{d.device_id}</option>)}
          </select>
        </div>
        <div className="range-buttons">
          {TIME_RANGES.map(r => (
            <button key={r.key} className={`range-btn ${timeRange === r.key ? 'active' : ''}`} onClick={() => onTimeRangeChange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loadingHistory ? (
        <div className="loading">Loading historical data...</div>
      ) : historyData.length === 0 ? (
        <div className="empty-state"><p>No historical data for this device and time range.</p></div>
      ) : (
        <>
          <StatsPanel stats={stats} connected={connected} />

          <div className="controls-row">
            <div className="controls">
              <label className="checkbox-label">
                <input type="checkbox" checked={showMovingAvg} onChange={e => setShowMovingAvg(e.target.checked)} />
                Moving Average (5pt)
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={showMinMax} onChange={e => setShowMinMax(e.target.checked)} />
                Min/Max Markers
              </label>
            </div>
            <button className="btn" onClick={handleExport}>Export CSV</button>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <h2>Temperature Over Time</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                  <Legend />
                  <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} dot={false} name="Temp (C)" />
                  {showMovingAvg && <Line type="monotone" dataKey="tempMA" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="MA(5)" />}
                  {showMinMax && stats.maxTemp != null && <ReferenceLine y={stats.maxTemp} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Max: ${stats.maxTemp.toFixed(1)}`, fill: '#ef4444', fontSize: 10 }} />}
                  {showMinMax && stats.minTemp != null && <ReferenceLine y={stats.minTemp} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: `Min: ${stats.minTemp.toFixed(1)}`, fill: '#3b82f6', fontSize: 10 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h2>Light Level Over Time</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ color: '#94a3b8' }} />
                  <Legend />
                  <Line type="monotone" dataKey="light" stroke="#06b6d4" strokeWidth={2} dot={false} name="Light (lx)" />
                  {showMovingAvg && <Line type="monotone" dataKey="lightMA" stroke="#67e8f9" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="MA(5)" />}
                  {showMinMax && stats.maxLight != null && <ReferenceLine y={stats.maxLight} stroke="#ef4444" strokeDasharray="3 3" label={{ value: `Max: ${stats.maxLight}`, fill: '#ef4444', fontSize: 10 }} />}
                  {showMinMax && stats.minLight != null && <ReferenceLine y={stats.minLight} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: `Min: ${stats.minLight}`, fill: '#3b82f6', fontSize: 10 }} />}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
