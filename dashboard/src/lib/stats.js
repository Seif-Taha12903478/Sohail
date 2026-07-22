export function computeStats(readings) {
  if (!readings || readings.length === 0) {
    return { avgTemp: null, maxTemp: null, minTemp: null, avgLight: null, maxLight: null, minLight: null, count: 0 };
  }
  const temps = readings.map(r => r.temp).filter(t => t != null);
  const lights = readings.map(r => r.light).filter(l => l != null);
  return {
    avgTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
    maxTemp: temps.length ? Math.max(...temps) : null,
    minTemp: temps.length ? Math.min(...temps) : null,
    avgLight: lights.length ? lights.reduce((a, b) => a + b, 0) / lights.length : null,
    maxLight: lights.length ? Math.max(...lights) : null,
    minLight: lights.length ? Math.min(...lights) : null,
    count: readings.length,
  };
}

export function movingAverage(data, field, window = 5) {
  if (!data || data.length === 0) return [];
  return data.map((_, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    const values = slice.map(d => d[field]).filter(v => v != null);
    if (values.length === 0) return null;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Math.round(avg * 100) / 100;
  });
}

export function exportToCsv(data, filename) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val == null) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(',')
    ),
  ];
  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
