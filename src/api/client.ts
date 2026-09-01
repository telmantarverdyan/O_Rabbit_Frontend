const AUTH_TOKEN_KEY = 'orabbit_auth_token';
const BACKEND_URL_KEY = 'orabbit_backend_url';

export function getAuthToken(): string {
  return localStorage.getItem(AUTH_TOKEN_KEY) || (import.meta.env.VITE_ORABBIT_AUTH_TOKEN as string) || '';
}

export function setAuthToken(token: string): void {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token.trim());
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getCustomBackendUrl(): string {
  return localStorage.getItem(BACKEND_URL_KEY) || '';
}

export function setCustomBackendUrl(url: string): void {
  if (url) {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error('Backend URL must start with http:// or https://');
    }
    localStorage.setItem(BACKEND_URL_KEY, trimmed);
  } else {
    localStorage.removeItem(BACKEND_URL_KEY);
  }
}

export async function apiClient<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const customBackend = getCustomBackendUrl();

  let url = path.startsWith('/') ? path : `/${path}`;
  if (customBackend) {
    url = `${customBackend}${url}`;
  }

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = response.statusText;
    try {
      const text = await response.text();
      if (text) {
        try {
          const errorJson = JSON.parse(text);
          errorDetail = errorJson.error || errorJson.message || text;
        } catch {
          errorDetail = text;
        }
      }
    } catch {}
    throw new Error(`API Error [${response.status}]: ${errorDetail}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return (await response.text()) as unknown as T;
}
