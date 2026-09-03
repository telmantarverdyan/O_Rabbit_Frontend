import { useState, useEffect, useRef, useCallback } from 'react';
import { getAuthToken, getCustomBackendUrl } from './client';
import { RunEvent } from './types';

const MAX_EVENT_BUFFER_SIZE = 1000;
export const INITIAL_RETRY_DELAY_MS = 1000;
export const MAX_RETRY_DELAY_MS = 30000;
export const BACKOFF_FACTOR = 1.5;
export const WATCHDOG_TIMEOUT_MS = 35000; // Force reconnect if no packet received within 35s

export type SSEConnectionState =
  | 'IDLE'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

/**
 * Calculates exponential backoff delay with random jitter to avoid thundering-herd issues.
 */
export function computeBackoffDelay(
  currentDelay: number,
  minDelay = INITIAL_RETRY_DELAY_MS,
  maxDelay = MAX_RETRY_DELAY_MS,
  factor = BACKOFF_FACTOR,
  jitterRatio = 0.2
): number {
  const scaled = Math.min(Math.max(currentDelay * factor, minDelay), maxDelay);
  // Random jitter in range [-jitterRatio, +jitterRatio]
  const jitter = 1 + (Math.random() * 2 - 1) * jitterRatio;
  return Math.round(Math.min(Math.max(scaled * jitter, minDelay), maxDelay));
}

export interface UseRunSSEReturn {
  events: RunEvent[];
  connected: boolean;
  reconnecting: boolean;
  connectionState: SSEConnectionState;
  retryCount: number;
  lastHeartbeat: Date | null;
  error: string | null;
  clearEvents: () => void;
  reconnectNow: () => void;
}

export function useRunSSE(runId?: string): UseRunSSEReturn {
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('IDLE');
  const [retryCount, setRetryCount] = useState<number>(0);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryDelayRef = useRef<number>(INITIAL_RETRY_DELAY_MS);
  const isSubscribedRef = useRef<boolean>(true);
  const reconnectTriggerRef = useRef<() => void>(() => {});

  const clearEvents = useCallback(() => setEvents([]), []);

  const resetWatchdog = useCallback(() => {
    if (watchdogTimeoutRef.current) {
      clearTimeout(watchdogTimeoutRef.current);
    }
    // If no data/heartbeat arrives within WATCHDOG_TIMEOUT_MS, abort and reconnect
    watchdogTimeoutRef.current = setTimeout(() => {
      if (isSubscribedRef.current && abortControllerRef.current) {
        setError('Heartbeat watchdog timeout: stream silent for >35s. Reconnecting...');
        abortControllerRef.current.abort();
      }
    }, WATCHDOG_TIMEOUT_MS);
  }, []);

  const reconnectNow = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
    setRetryCount(0);
    reconnectTriggerRef.current();
  }, []);

  useEffect(() => {
    if (!runId) {
      setEvents([]);
      setConnectionState('IDLE');
      setError(null);
      setRetryCount(0);
      setLastHeartbeat(null);
      return;
    }

    isSubscribedRef.current = true;

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
      if (!isSubscribedRef.current) return;

      const token = getAuthToken();
      const customBackend = getCustomBackendUrl();
      const basePath = `/sse?run_id=${encodeURIComponent(runId!)}`;
      const url = customBackend ? `${customBackend}${basePath}` : basePath;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setConnectionState((prev) => (prev === 'CONNECTED' ? 'RECONNECTING' : 'CONNECTING'));
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
          throw new Error(`SSE stream failed with HTTP status ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No readable stream returned by master SSE endpoint');
        }

        setConnectionState('CONNECTED');
        setRetryCount(0);
        retryDelayRef.current = INITIAL_RETRY_DELAY_MS;
        setLastHeartbeat(new Date());
        resetWatchdog();

        const decoder = new TextDecoder();
        let buffer = '';

        while (isSubscribedRef.current) {
          const { done, value } = await reader.read();
          if (done) break;

          setLastHeartbeat(new Date());
          resetWatchdog();

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          const batch: RunEvent[] = [];

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) {
              // Comment or keep-alive ping (: ping)
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
        if (err.name !== 'AbortError' && isSubscribedRef.current) {
          setError(err.message || 'SSE stream connection interrupted');
          scheduleReconnect();
        }
      } finally {
        if (watchdogTimeoutRef.current) {
          clearTimeout(watchdogTimeoutRef.current);
        }
        if (isSubscribedRef.current && connectionState === 'CONNECTED') {
          setConnectionState('DISCONNECTED');
        }
      }
    }

    function scheduleReconnect() {
      if (!isSubscribedRef.current) return;
      setConnectionState('RECONNECTING');
      setRetryCount((c) => c + 1);

      const delay = computeBackoffDelay(retryDelayRef.current);
      retryDelayRef.current = delay;

      retryTimeoutRef.current = setTimeout(() => {
        if (isSubscribedRef.current) {
          streamSSE();
        }
      }, delay);
    }

    reconnectTriggerRef.current = streamSSE;
    streamSSE();

    return () => {
      isSubscribedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (watchdogTimeoutRef.current) {
        clearTimeout(watchdogTimeoutRef.current);
      }
    };
  }, [runId, resetWatchdog]);

  return {
    events,
    connected: connectionState === 'CONNECTED',
    reconnecting: connectionState === 'RECONNECTING',
    connectionState,
    retryCount,
    lastHeartbeat,
    error,
    clearEvents,
    reconnectNow,
  };
}
