import { config } from '../config.js';

export function getToken() {
  return localStorage.getItem('api_token') || '';
}

export function setToken(token) {
  localStorage.setItem('api_token', token);
}

export function clearToken() {
  localStorage.removeItem('api_token');
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export async function apiGet(path, token) {
  const res = await fetch(`${config.apiBase}${path}`, { headers: authHeaders(token) });
  if (res.status === 401) throw new ApiError('Unauthorized', 401);
  if (!res.ok) throw new ApiError(`API error ${res.status}`, res.status);
  return res.json();
}

export async function apiPost(path, body, token) {
  const res = await fetch(`${config.apiBase}${path}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new ApiError('Unauthorized', 401);
  if (!res.ok) throw new ApiError(`API error ${res.status}`, res.status);
  return res.json();
}

export async function apiPatch(path, body, token) {
  const res = await fetch(`${config.apiBase}${path}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new ApiError('Unauthorized', 401);
  if (!res.ok) throw new ApiError(`API error ${res.status}`, res.status);
  return res.json();
}

export async function apiDelete(path, token) {
  const res = await fetch(`${config.apiBase}${path}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (res.status === 401) throw new ApiError('Unauthorized', 401);
  if (!res.ok) throw new ApiError(`API error ${res.status}`, res.status);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
