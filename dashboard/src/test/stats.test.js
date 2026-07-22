import { describe, it, expect } from 'vitest';
import { computeStats, movingAverage, exportToCsv } from '../lib/stats.js';

describe('computeStats', () => {
  it('returns nulls for empty array', () => {
    const stats = computeStats([]);
    expect(stats.avgTemp).toBeNull();
    expect(stats.maxTemp).toBeNull();
    expect(stats.minTemp).toBeNull();
    expect(stats.count).toBe(0);
  });

  it('computes correct averages, min, max for temp and light', () => {
    const readings = [
      { temp: 20, light: 100 },
      { temp: 30, light: 200 },
      { temp: 25, light: 150 },
    ];
    const stats = computeStats(readings);
    expect(stats.avgTemp).toBeCloseTo(25);
    expect(stats.maxTemp).toBe(30);
    expect(stats.minTemp).toBe(20);
    expect(stats.avgLight).toBeCloseTo(150);
    expect(stats.maxLight).toBe(200);
    expect(stats.minLight).toBe(100);
    expect(stats.count).toBe(3);
  });

  it('handles null values gracefully', () => {
    const readings = [{ temp: 20, light: null }, { temp: null, light: 200 }];
    const stats = computeStats(readings);
    expect(stats.avgTemp).toBe(20);
    expect(stats.avgLight).toBe(200);
  });
});

describe('movingAverage', () => {
  it('returns empty array for empty input', () => {
    expect(movingAverage([], 'temp')).toEqual([]);
  });

  it('computes simple moving average with window 5', () => {
    const data = [{ temp: 10 }, { temp: 20 }, { temp: 30 }, { temp: 40 }, { temp: 50 }];
    const result = movingAverage(data, 'temp', 5);
    expect(result[0]).toBe(10);
    expect(result[4]).toBe(30);
  });

  it('handles window larger than data', () => {
    const data = [{ temp: 10 }, { temp: 20 }];
    const result = movingAverage(data, 'temp', 5);
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(15);
  });

  it('handles null field values', () => {
    const data = [{ temp: 10 }, { temp: null }, { temp: 30 }];
    const result = movingAverage(data, 'temp', 3);
    expect(result[0]).toBe(10);
    expect(result[2]).toBe(20);
  });
});

describe('exportToCsv', () => {
  it('does nothing for empty data', () => {
    expect(() => exportToCsv([], 'test.csv')).not.toThrow();
  });

  it('creates a download link with CSV content', () => {
    global.URL.createObjectURL = vi.fn(() => 'blob:test');
    global.URL.revokeObjectURL = vi.fn();
    const data = [{ device_id: 'esp32-001', temp: 25.5, light: 300 }];
    const clickSpy = vi.fn();
    const createElementOrig = document.createElement;
    document.createElement = (tag) => {
      const el = createElementOrig.call(document, tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    };
    exportToCsv(data, 'test.csv');
    expect(clickSpy).toHaveBeenCalled();
    document.createElement = createElementOrig;
    delete global.URL.createObjectURL;
    delete global.URL.revokeObjectURL;
  });
});
