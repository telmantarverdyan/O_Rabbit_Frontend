import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ApiError,
  MASTER_HEADER,
  UNAUTHORIZED_EVENT,
  apiClient,
  apiRequest,
  clearSession,
  getLastMasterUrl,
  getSession,
  normalizeMasterUrl,
  saveSession,
} from './client';

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

describe('api/client', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('normalizeMasterUrl', () => {
    it('adds http:// and strips paths and trailing slashes', () => {
      expect(normalizeMasterUrl('10.0.0.5:9100')).toBe('http://10.0.0.5:9100');
      expect(normalizeMasterUrl(' https://master.example.com/ ')).toBe('https://master.example.com');
      expect(normalizeMasterUrl('http://10.0.0.5:9100/api/v1')).toBe('http://10.0.0.5:9100');
    });

    it('rejects empty and non-http addresses', () => {
      expect(() => normalizeMasterUrl('  ')).toThrow('Master address is required');
      expect(() => normalizeMasterUrl('ftp://host')).toThrow('http:// or https://');
    });
  });

  describe('session storage', () => {
    it('needs both a master URL and a token', () => {
      expect(getSession()).toBeNull();
      saveSession({ masterUrl: 'http://m:9100', token: ' tok ' });
      expect(getSession()).toEqual({ masterUrl: 'http://m:9100', token: 'tok' });
    });

    it('keeps the token in sessionStorage only', () => {
      saveSession({ masterUrl: 'http://m:9100', token: 'tok' });
      expect(Object.values({ ...localStorage })).not.toContain('tok');
    });

    it('forgets the token on logout but remembers the master address', () => {
      saveSession({ masterUrl: 'http://m:9100', token: 'tok' });
      clearSession();
      expect(getSession()).toBeNull();
      expect(getLastMasterUrl()).toBe('http://m:9100');
    });
  });

  describe('apiClient', () => {
    it('calls /api/v1 on this origin with the master header and bearer token', async () => {
      saveSession({ masterUrl: 'http://m:9100', token: 'tok' });
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse([{ id: 'w1' }]));

      const result = await apiClient('workers');

      expect(fetchSpy.mock.calls[0][0]).toBe('/api/v1/workers');
      const headers = fetchSpy.mock.calls[0][1]?.headers as Headers;
      expect(headers.get(MASTER_HEADER)).toBe('http://m:9100');
      expect(headers.get('Authorization')).toBe('Bearer tok');
      expect(headers.has('Content-Type')).toBe(false);
      expect(result).toEqual([{ id: 'w1' }]);
    });

    it('keeps absolute paths such as /status unversioned', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({}));
      await apiClient('/status');
      expect(fetchSpy.mock.calls[0][0]).toBe('/status');
    });

    it('exposes response headers for cursor paging', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse([], 200, { 'X-Next-Cursor': 'abc' }));
      const { headers } = await apiRequest('runs');
      expect(headers.get('X-Next-Cursor')).toBe('abc');
    });

    it('parses the master error envelope, including field errors', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'invalid_input',
              message: 'invalid job',
              details: { errors: [{ field: 'options_json.planned_tasks', error: 'must be a number' }] },
              request_id: 'req-1',
            },
          },
          400
        )
      );

      const err = (await apiClient('jobs').catch((e: unknown) => e)) as ApiError;
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.code).toBe('invalid_input');
      expect(err.message).toBe('invalid job');
      expect(err.requestId).toBe('req-1');
      expect(err.fieldErrors).toEqual([{ field: 'options_json.planned_tasks', error: 'must be a number' }]);
    });

    it('reports proxy errors with a plain string message', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({ error: 'Master http://m:9100 is unreachable' }, 502));
      await expect(apiClient('runs')).rejects.toThrow('Master http://m:9100 is unreachable');
    });

    it('announces a 401 so the app can return to the login page', async () => {
      const listener = vi.fn();
      window.addEventListener(UNAUTHORIZED_EVENT, listener);
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(jsonResponse({ error: { code: 'unauthorized', message: 'unauthorized' } }, 401));

      await expect(apiClient('runs')).rejects.toBeInstanceOf(ApiError);
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener(UNAUTHORIZED_EVENT, listener);
    });

    it('returns undefined for 204 No Content', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce(new Response(null, { status: 204 }));
      await expect(apiClient('jobs/1', { method: 'DELETE' })).resolves.toBeUndefined();
    });
  });
});
