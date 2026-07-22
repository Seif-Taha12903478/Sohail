import { useState } from 'react';
import { config } from '../config.js';
import { setToken } from '../lib/api.js';

export function LoginScreen({ onLogin, error, setError }) {
  const [tokenInput, setTokenInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setError('Please enter an API token');
      return;
    }
    setError('');
    fetch(`${config.apiBase}/devices`, { headers: { Authorization: `Bearer ${tokenInput.trim()}` } })
      .then(res => {
        if (res.status === 401) {
          setError('Invalid token. Check with your team for the API token.');
          return null;
        }
        if (!res.ok) throw new Error('Server error');
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const t = tokenInput.trim();
        setToken(t);
        onLogin(t, data || []);
      })
      .catch(err => setError(`Connection failed: ${err.message}`));
  };

  return (
    <div className="app">
      <div className="login-screen">
        <div className="login-card">
          <h2>IoT Dashboard Login</h2>
          <p>Enter the API token to access telemetry, history, and alerts.</p>
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={handleSubmit}>
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
