import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken, getCustomBackendUrl } from './client';
import { RunEvent } from './types';

const MAX_EVENT_BUFFER_SIZE = 1000;
const INITIAL_RETRY_DELAY_MS = 1500;
const MAX_RETRY_DELAY_MS = 15000;

export function useRunSSE(runId?: string) {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState<boolean>(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryDelayRef = useRef<number>(INITIAL_RETRY_DELAY_MS);

  const clearEvents = useCallback(() => setEvents([]), []);

  useEffect(() => {
    if (!runId) {
      setEvents([]);
      setConnected(false);
      setError(null);
      setReconnecting(false);
      return;
    }

    let isSubscribed = true;

    function appendEvents(newEvents: RunEvent[]) {
      if (newEvents.length === 0) return;
      setEvents((prev) => {
        const combined = [...prev, ...newEvents];
        return combined.length > MAX_EVENT_BUFFER_SIZE
          ? combined.slice(combined.length - MAX_EVENT_BUFFER_SIZE)
          : combined;
      });
    }

    async function streamSSE() {
      if (!isSubscribed) return;

      const token = getAuthToken();
      const customBackend = getCustomBackendUrl();
      const basePath = `/sse?run_id=${encodeURIComponent(runId!)}`;
      const url = customBackend ? `${customBackend}${basePath}` : basePath;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setError(null);

        const headers: HeadersInit = {
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          headers,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`SSE stream failed with status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No readable stream returned by SSE endpoint');
        }

        setConnected(true);
        setReconnecting(false);
        retryDelayRef.current = INITIAL_RETRY_DELAY_MS; // reset backoff on success

        const decoder = new TextDecoder();
        let buffer = '';

        while (isSubscribed) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          const batch: RunEvent[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) {
              // Comment or heartbeat ping
              continue;
            }

            if (trimmed.startsWith('data:')) {
              const jsonStr = trimmed.slice(5).trim();
              if (jsonStr) {
                try {
                  const parsed = JSON.parse(jsonStr);
                  batch.push(parsed);
                } catch {
                  batch.push({
                    id: String(Date.now() + Math.random()),
                    run_id: runId || '',
                    ts: new Date().toISOString(),
                    level: 'INFO',
                    message: jsonStr,
                  });
                }
              }
            }
          }

          if (batch.length > 0) {
            appendEvents(batch);
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && isSubscribed) {
          setError(err.message || 'SSE stream connection interrupted');
          scheduleReconnect();
        }
      } finally {
        if (isSubscribed) {
          setConnected(false);
        }
      }
    }

    function scheduleReconnect() {
      if (!isSubscribed) return;
      setReconnecting(true);
      const delay = retryDelayRef.current;
      retryDelayRef.current = Math.min(delay * 1.5, MAX_RETRY_DELAY_MS);

      retryTimeoutRef.current = setTimeout(() => {
        if (isSubscribed) {
          streamSSE();
        }
      }, delay);
    }

    streamSSE();

    return () => {
      isSubscribed = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [runId]);

  return { events, connected, reconnecting, error, clearEvents };
}

