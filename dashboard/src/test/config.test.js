import { describe, it, expect } from 'vitest';
import { config, TIME_RANGES, MODE_NAMES, SEVERITY_ORDER, formatTime, formatDateTime } from '../config.js';

describe('config', () => {
  it('has required API and MQTT settings', () => {
    expect(config.apiBase).toBeDefined();
    expect(config.mqttBroker).toBeDefined();
    expect(config.telemetryTopic).toBe('device/telemetry');
    expect(config.commandTopic).toBe('device/commands');
  });
});

describe('TIME_RANGES', () => {
  it('has 1h, 24h, 7d options', () => {
    const keys = TIME_RANGES.map(r => r.key);
    expect(keys).toContain('1h');
    expect(keys).toContain('24h');
    expect(keys).toContain('7d');
  });

  it('has correct millisecond values', () => {
    const oneHour = TIME_RANGES.find(r => r.key === '1h');
    expect(oneHour.ms).toBe(3_600_000);
    const oneDay = TIME_RANGES.find(r => r.key === '24h');
    expect(oneDay.ms).toBe(86_400_000);
  });
});

describe('MODE_NAMES', () => {
  it('maps 1 to Normal, 2 to Fast, 3 to Standby', () => {
    expect(MODE_NAMES[1]).toBe('Normal');
    expect(MODE_NAMES[2]).toBe('Fast');
    expect(MODE_NAMES[3]).toBe('Standby');
  });
});

describe('SEVERITY_ORDER', () => {
  it('lists critical first', () => {
    expect(SEVERITY_ORDER[0]).toBe('critical');
    expect(SEVERITY_ORDER).toContain('warning');
    expect(SEVERITY_ORDER).toContain('info');
  });
});

describe('formatTime', () => {
  it('formats a timestamp to time string', () => {
    const ts = '2024-01-15T10:30:00Z';
    const result = formatTime(ts);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('formatDateTime', () => {
  it('formats a timestamp to date+time string', () => {
    const ts = '2024-01-15T10:30:00Z';
    const result = formatDateTime(ts);
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
