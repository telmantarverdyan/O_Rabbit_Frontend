import { useEffect, useState } from 'react';
import { API_PREFIX, ApiError, masterHeaders } from './client';
import { OpsStreamEvent } from './types';

export interface OpsStreamState {
  events: OpsStreamEvent[];
  /** Final status from the `*.completed` event, e.g. SUCCEEDED or FAILED. */
  finalStatus: string | null;
  error: string | null;
  open: boolean;
}

const MAX_EVENTS = 2000;

/**
 * Follows a deployment's event stream (replay + live, ends when the command finishes).
 * Unlike run events, a deployment is short-lived, so there is no reconnect loop:
 * on a dropped connection the caller can reopen the dialog, and the master replays.
 */
export function useDeploymentStream(deploymentId: string | null): OpsStreamState {
  const [state, setState] = useState<OpsStreamState>({ events: [], finalStatus: null, error: null, open: false });

  useEffect(() => {
    if (!deploymentId) return;
    const controller = new AbortController();
    setState({ events: [], finalStatus: null, error: null, open: true });

    (async () => {
      try {
        const headers = masterHeaders(undefined, 'ops');
        headers.set('Accept', 'text/event-stream');
        const res = await fetch(`${API_PREFIX}/deployments/${encodeURIComponent(deploymentId)}/events/stream`, { headers, signal: controller.signal });
        if (!res.ok || !res.body) throw new ApiError(res.status, `Event stream failed with HTTP ${res.status}`);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const frames = buffer.split('\n\n');
          buffer = frames.pop() ?? '';
          const parsed: OpsStreamEvent[] = [];
          for (const frame of frames) {
            const data = frame.split('\n').find((l) => l.startsWith('data:'));
            if (!data) continue; // keepalive comment
            try {
              parsed.push(JSON.parse(data.slice(5).trim()) as OpsStreamEvent);
            } catch {
              // Ignore a malformed frame rather than dropping the stream.
            }
          }
          if (parsed.length) {
            setState((prev) => {
              const seen = new Set(prev.events.map((e) => e.sequence));
              const events = [...prev.events, ...parsed.filter((e) => !seen.has(e.sequence))].slice(-MAX_EVENTS);
              const done = parsed.find((e) => e.type.endsWith('.completed'));
              return { ...prev, events, finalStatus: done?.data?.status ? String(done.data.status) : prev.finalStatus };
            });
          }
        }
        setState((prev) => ({ ...prev, open: false }));
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setState((prev) => ({ ...prev, open: false, error: (err as Error).message }));
      }
    })();

    return () => controller.abort();
  }, [deploymentId]);

  return state;
}
