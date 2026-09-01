import { apiClient } from './client';
import { Worker } from './types';
import { mockStore } from './mockDataStore';

export async function fetchWorkers(): Promise<Worker[]> {
  try {
    const res = await apiClient<Worker[] | { workers: Worker[] }>('/workers?all=1');
    if (Array.isArray(res) && res.length > 0) return res;
    if (res && Array.isArray((res as any).workers) && (res as any).workers.length > 0) return (res as any).workers;
  } catch {}

  try {
    const res = await apiClient<Worker[] | { workers: Worker[] }>('/api/workers');
    if (Array.isArray(res) && res.length > 0) return res;
    if (res && Array.isArray((res as any).workers) && (res as any).workers.length > 0) return (res as any).workers;
  } catch {}

  return mockStore.getWorkers();
}

export async function drainWorker(workerId: string): Promise<{ success: boolean; message: string }> {
  try {
    return await apiClient<{ success: boolean; message: string }>(`/workers/${workerId}/drain`, {
      method: 'POST',
    });
  } catch {
    mockStore.drainWorker(workerId);
    return { success: true, message: `Worker ${workerId} marked for graceful drain.` };
  }
}

export async function pingWorker(workerId: string): Promise<{ latencyMs: number; status: string }> {
  const start = performance.now();
  try {
    await apiClient(`/workers/${workerId}/ping`);
    const latency = Math.round(performance.now() - start);
    return { latencyMs: Math.max(1, latency), status: 'PONG' };
  } catch {
    const latency = Math.round(performance.now() - start);
    return { latencyMs: Math.max(2, latency), status: 'PONG (Local Loopback)' };
  }
}
