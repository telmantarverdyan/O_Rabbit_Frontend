import { apiClient } from './client';
import { StatusInfo } from './types';
import { mockStore } from './mockDataStore';

export async function fetchStatus(): Promise<StatusInfo> {
  try {
    const res = await apiClient<StatusInfo>('/status');
    if (res && res.status) return res;
  } catch {}
  return mockStore.getStatus();
}

export async function fetchHealth(): Promise<{ status: string }> {
  try {
    const res = await apiClient<string>('/healthz');
    return { status: res === 'ok' ? 'healthy' : 'degraded' };
  } catch {
    return { status: 'unreachable' };
  }
}

export async function fetchMetrics(): Promise<string> {
  return await apiClient<string>('/metrics');
}
