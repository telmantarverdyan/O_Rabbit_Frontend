// The UI never calls the master directly: the browser would block it, because
// the master sends no CORS headers. Every request goes to this app's own origin
// under API_PREFIX, and the dev/preview server forwards it to the master named
// in the MASTER_HEADER (see the masterProxy plugin in vite.config.ts).

export const API_PREFIX = '/api/v1';
export const MASTER_HEADER = 'X-ORabbit-Master';
export const UNAUTHORIZED_EVENT = 'orabbit:unauthorized';

const MASTER_URL_KEY = 'orabbit_master_url';
// The token lives in sessionStorage so it is forgotten when the tab closes.
const AUTH_TOKEN_KEY = 'orabbit_auth_token';

export interface Session {
  masterUrl: string;
  token: string;
}

function safeGet(storage: Storage, key: string): string {
  try {
    return storage.getItem(key) || '';
  } catch {
    return '';
  }
}

/** Normalizes a master address typed by the user, such as `10.0.0.5:9100`. */
export function normalizeMasterUrl(raw: string): string {
  let url = raw.trim().replace(/\/+$/, '');
  if (!url) throw new Error('Master address is required');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `http://${url}`;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`"${raw}" is not a valid address`);
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Master address must use http:// or https://');
  }
  return `${parsed.protocol}//${parsed.host}`;
}

export function getSession(): Session | null {
  const masterUrl = safeGet(localStorage, MASTER_URL_KEY);
  const token = safeGet(sessionStorage, AUTH_TOKEN_KEY);
  return masterUrl && token ? { masterUrl, token } : null;
}

/** The last master address, kept after logout to prefill the login form. */
export function getLastMasterUrl(): string {
  return safeGet(localStorage, MASTER_URL_KEY);
}

export function saveSession(session: Session): void {
  localStorage.setItem(MASTER_URL_KEY, session.masterUrl);
  sessionStorage.setItem(AUTH_TOKEN_KEY, session.token.trim());
}

export function clearSession(): void {
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  code: string;
  details: unknown;
  requestId: string;

  constructor(status: number, message: string, code = '', details: unknown = null, requestId = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** Per-field problems from a 400 invalid_input (`details.errors`). */
  get fieldErrors(): Array<{ field: string; error: string }> {
    const errors = (this.details as { errors?: unknown } | null)?.errors;
    return Array.isArray(errors) ? (errors as Array<{ field: string; error: string }>) : [];
  }
}

/** Builds an ApiError from the master's envelope: {"error": {code, message, details, request_id}}. */
async function toApiError(response: Response): Promise<ApiError> {
  const text = await response.text().catch(() => '');
  try {
    const body = JSON.parse(text);
    const err = body?.error;
    if (err && typeof err === 'object') {
      return new ApiError(response.status, err.message || response.statusText, err.code, err.details, err.request_id);
    }
    if (typeof err === 'string') {
      // The dev proxy reports an unreachable master as {"error": "..."}.
      return new ApiError(response.status, err, 'proxy_error', body);
    }
  } catch {
    // Not JSON: fall through and use the raw text.
  }
  return new ApiError(response.status, text || response.statusText || `HTTP ${response.status}`);
}

/** Headers every master request needs. */
export function masterHeaders(session: Session | null = getSession()): Headers {
  const headers = new Headers();
  if (session) {
    headers.set(MASTER_HEADER, session.masterUrl);
    headers.set('Authorization', `Bearer ${session.token}`);
  }
  return headers;
}

export interface ApiResponse<T> {
  data: T;
  headers: Headers;
}

/** Like apiClient, but also returns the response headers (used for X-Next-Cursor paging). */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  session: Session | null = getSession()
): Promise<ApiResponse<T>> {
  const headers = masterHeaders(session);
  new Headers(options.headers).forEach((value, key) => headers.set(key, value));
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  const url = path.startsWith('/') ? path : `${API_PREFIX}/${path}`;
  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await toApiError(response);
    if (response.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw error;
  }

  if (response.status === 204) return { data: undefined as T, headers: response.headers };
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json() : await response.text();
  return { data: data as T, headers: response.headers };
}

/** Calls the master. Paths without a leading slash are relative to /api/v1. */
export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await apiRequest<T>(path, options)).data;
}

export function postJSON<T>(path: string, body: unknown): Promise<T> {
  return apiClient<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
}

export function putJSON<T>(path: string, body: unknown): Promise<T> {
  return apiClient<T>(path, { method: 'PUT', body: JSON.stringify(body) });
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const fields = err.fieldErrors.map((f) => `${f.field}: ${f.error}`).join('; ');
    return fields ? `${err.message} (${fields})` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
}
