import { useState, useMemo } from 'react';
import { SEVERITY_ORDER, formatDateTime } from '../config.js';
import { apiPatch } from '../lib/api.js';

const STATUS_LABELS = { active: 'Active', acknowledged: 'Acknowledged', resolved: 'Resolved' };

export function AlertsView({ alerts, loadingAlerts, token, onAlertUpdated }) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && (a.status || (a.resolved ? 'resolved' : 'active')) !== statusFilter) return false;
      return true;
    });
  }, [alerts, severityFilter, statusFilter]);

  const activeAlerts = filteredAlerts.filter(a => (a.status || (a.resolved ? 'resolved' : 'active')) === 'active');

  const handleAcknowledge = async (id) => {
    try {
      await apiPatch(`/alerts/${id}/ack`, {}, token);
      onAlertUpdated();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err.message);
    }
  };

  const handleResolve = async (id) => {
    try {
      await apiPatch(`/alerts/${id}/resolve`, {}, token);
      onAlertUpdated();
    } catch (err) {
      console.error('Failed to resolve alert:', err.message);
    }
  };

  const renderAlertItem = (a, showActions = false) => {
    const status = a.status || (a.resolved ? 'resolved' : 'active');
    return (
      <div key={a.id} className={`alert-item ${a.severity}`} style={{ opacity: status === 'resolved' ? 0.5 : 1 }}>
        <span className={`alert-severity ${a.severity}`}>{a.severity}</span>
        <div className="alert-content">
          <div className="alert-device">{a.device_id}</div>
          <div className="alert-message">{a.message}</div>
          {showActions && status !== 'resolved' && (
            <div className="alert-actions">
              {status === 'active' && (
                <button className="btn-sm" onClick={() => handleAcknowledge(a.id)}>Acknowledge</button>
              )}
              <button className="btn-sm" onClick={() => handleResolve(a.id)}>Resolve</button>
            </div>
          )}
        </div>
        <div className="alert-meta">
          <span className={`alert-status-badge ${status}`}>{STATUS_LABELS[status]}</span>
          <span className="alert-time">{formatDateTime(a.ts)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="controls-row">
        <div className="controls">
          <span className="label">Severity:</span>
          <select className="select" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
            <option value="all">All Severities</option>
            {SEVERITY_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="label" style={{ marginLeft: '12px' }}>Status:</span>
          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="section-title"><h2>Active Alerts ({activeAlerts.length})</h2></div>
        {loadingAlerts ? (
          <div className="loading">Loading alerts...</div>
        ) : activeAlerts.length === 0 ? (
          <div className="empty-state"><p>No active alerts. All clear.</p></div>
        ) : (
          activeAlerts.map(a => renderAlertItem(a, true))
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <h2>Alert History ({filteredAlerts.length})</h2>
        {filteredAlerts.length === 0 ? (
          <div className="empty-state"><p>No alerts match the current filters.</p></div>
        ) : (
          filteredAlerts.slice(0, 50).map(a => renderAlertItem(a, false))
        )}
      </div>
    </div>
  );
}
