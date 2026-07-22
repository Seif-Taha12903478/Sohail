import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError, apiGet, apiPost, apiPatch, apiDelete } from '../lib/api.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('apiGet', () => {
  it('returns parsed JSON on success', async () => {
    const mockData = [{ device_id: 'esp32-001' }];
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => mockData,
    });
    const result = await apiGet('/devices', 'test-token');
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/devices'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('throws ApiError on 401', async () => {
    mockFetch.mockResolvedValueOnce({ status: 401, ok: false, json: async () => ({}) });
    await expect(apiGet('/devices', 'bad-token')).rejects.toThrow(ApiError);
  });

  it('throws ApiError on non-ok status', async () => {
    mockFetch.mockResolvedValueOnce({ status: 500, ok: false, json: async () => ({}) });
    await expect(apiGet('/devices', 'test-token')).rejects.toThrow();
  });
});

describe('apiPost', () => {
  it('sends POST with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({ status: 201, ok: true, json: async () => ({ id: '123' }) });
    const result = await apiPost('/thresholds', { device_id: 'x' }, 'token');
    expect(result).toEqual({ id: '123' });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/thresholds'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ device_id: 'x' }),
      })
    );
  });
});

describe('apiPatch', () => {
  it('sends PATCH with JSON body', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200, ok: true, json: async () => ({ id: '123', status: 'acknowledged' }) });
    const result = await apiPatch('/alerts/123/ack', {}, 'token');
    expect(result.status).toBe('acknowledged');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/alerts/123/ack'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });
});

describe('apiDelete', () => {
  it('sends DELETE and resolves on success', async () => {
    mockFetch.mockResolvedValueOnce({ status: 204, ok: true });
    await expect(apiDelete('/thresholds/123', 'token')).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/thresholds/123'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('ApiError', () => {
  it('has name, message, and status', () => {
    const err = new ApiError('Test error', 404);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Test error');
    expect(err.status).toBe(404);
  });
});
