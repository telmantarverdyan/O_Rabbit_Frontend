import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getAuthToken,
  setAuthToken,
  getCustomBackendUrl,
  setCustomBackendUrl,
  apiClient,
  ApiError,
} from './client';

describe('api/client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Auth Token Management', () => {
    it('returns empty string when no token is stored', () => {
      expect(getAuthToken()).toBe('');
    });

    it('stores and retrieves token correctly', () => {
      setAuthToken('secret-test-token-123');
      expect(getAuthToken()).toBe('secret-test-token-123');
    });

    it('removes token when empty string is passed', () => {
      setAuthToken('temp-token');
      expect(getAuthToken()).toBe('temp-token');
      setAuthToken('');
      expect(getAuthToken()).toBe('');
    });
  });

  describe('Custom Backend URL Management', () => {
    it('returns empty string when no custom backend is stored', () => {
      expect(getCustomBackendUrl()).toBe('');
    });

    it('stores valid HTTP and HTTPS URLs and strips trailing slashes', () => {
      setCustomBackendUrl('http://192.168.1.100:8080/');
      expect(getCustomBackendUrl()).toBe('http://192.168.1.100:8080');

      setCustomBackendUrl('https://api.orabbit.data/');
      expect(getCustomBackendUrl()).toBe('https://api.orabbit.data');
    });

    it('throws error when URL does not start with http:// or https://', () => {
      expect(() => setCustomBackendUrl('ftp://invalid.com')).toThrow(
        'Backend URL must start with http:// or https://'
      );
      expect(() => setCustomBackendUrl('localhost:8080')).toThrow(
        'Backend URL must start with http:// or https://'
      );
    });

    it('removes custom backend when empty string passed', () => {
      setCustomBackendUrl('http://localhost:9000');
      expect(getCustomBackendUrl()).toBe('http://localhost:9000');
      setCustomBackendUrl('');
      expect(getCustomBackendUrl()).toBe('');
    });
  });

  describe('apiClient HTTP requests', () => {
    it('makes a request with correct default headers and parses JSON', async () => {
      const mockResponseData = { status: 'healthy', version: '1.0.0' };

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponseData,
      } as Response);

      const result = await apiClient('/status');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/status',
        expect.objectContaining({
          headers: expect.any(Headers),
        })
      );

      const calledHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers;
      expect(calledHeaders.get('Content-Type')).toBe('application/json');
      expect(calledHeaders.has('Authorization')).toBe(false);
      expect(result).toEqual(mockResponseData);
    });

    it('injects Authorization Bearer token header when token is stored', async () => {
      setAuthToken('bearer-jwt-token-999');

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true }),
      } as Response);

      await apiClient('/jobs');

      const calledHeaders = fetchSpy.mock.calls[0][1]?.headers as Headers;
      expect(calledHeaders.get('Authorization')).toBe('Bearer bearer-jwt-token-999');
    });

    it('prepends custom backend URL when configured', async () => {
      setCustomBackendUrl('http://10.0.0.5:8080');

      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({}),
      } as Response);

      await apiClient('/api/workers');

      expect(fetchSpy).toHaveBeenCalledWith('http://10.0.0.5:8080/api/workers', expect.anything());
    });

    it('returns empty object for 204 No Content response', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: new Headers(),
      } as Response);

      const result = await apiClient('/runs/123/cancel', { method: 'POST' });
      expect(result).toEqual({});
    });

    it('throws formatted error with status code and body message on HTTP failure', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => JSON.stringify({ error: 'Run not found' }),
      } as Response);

      await expect(apiClient('/runs/999')).rejects.toThrow('API Error [404]: Run not found');
    });

    it('throws an instance of ApiError containing status code', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => JSON.stringify({ message: 'Invalid token' }),
      } as Response);

      try {
        await apiClient('/api/secure');
        expect.fail('Should have thrown');
      } catch (err: any) {
        expect(err.name).toBe('ApiError');
        expect(err.status).toBe(401);
        expect(err.message).toContain('API Error [401]: Invalid token');
      }
    });
  });
});
