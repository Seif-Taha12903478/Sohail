import { useState, useCallback } from 'react';
import { apiGet } from '../lib/api.js';

export function useApiData(token, authFailed) {
  const [devices, setDevices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchDevices = useCallback(async () => {
    if (!token || authFailed) return;
    try {
      setApiError(null);
      const data = await apiGet('/devices', token);
      setDevices(data || []);
      return data || [];
    } catch (err) {
      setApiError(err.message);
      console.error('Failed to load devices:', err.message);
    }
  }, [token, authFailed]);

  const fetchAlerts = useCallback(async () => {
    if (!token || authFailed) return;
    try {
      setApiError(null);
      const data = await apiGet('/alerts', token);
      setAlerts(data || []);
      return data || [];
    } catch (err) {
      setApiError(err.message);
      console.error('Failed to load alerts:', err.message);
    }
  }, [token, authFailed]);

  const fetchThresholds = useCallback(async (device) => {
    if (!token || authFailed) return;
    try {
      const path = device ? `/thresholds?device=${encodeURIComponent(device)}` : '/thresholds';
      const data = await apiGet(path, token);
      setThresholds(data || []);
      return data || [];
    } catch (err) {
      console.error('Failed to load thresholds:', err.message);
    }
  }, [token, authFailed]);

  const fetchHistory = useCallback(async (device, timeRangeMs) => {
    if (!token || authFailed || !device) return [];
    const from = new Date(Date.now() - timeRangeMs).toISOString();
    try {
      setApiError(null);
      const data = await apiGet(`/readings?device=${encodeURIComponent(device)}&from=${encodeURIComponent(from)}`, token);
      return data || [];
    } catch (err) {
      setApiError(err.message);
      console.error('Failed to load history:', err.message);
      return [];
    }
  }, [token, authFailed]);

  const retry = useCallback(() => {
    setRetryCount(c => c + 1);
  }, []);

  return {
    devices, alerts, thresholds, loadingAlerts, apiError, retryCount,
    setAlerts, setThresholds, setLoadingAlerts, setApiError,
    fetchDevices, fetchAlerts, fetchThresholds, fetchHistory, retry,
  };
}
