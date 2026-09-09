import { apiClient, ApiError } from './client';
import { Job } from './types';
import { mockStore } from './mockDataStore';

export interface CreateJobPayload {
  name?: string;
  source_connection_id: string;
  target_connection_id: string;
  source_sql?: string;
  target_namespace?: string;
  target_table?: string;
  write_mode?: string;
  incremental?: boolean;
  hwm_column?: string;
  options_json?: Record<string, any>;
}

export async function fetchJobs(): Promise<Job[]> {
  try {
    const res = await apiClient<Job[] | { jobs: Job[] }>('/jobs');
    if (Array.isArray(res) && res.length > 0) return res;
    if (res && Array.isArray((res as any).jobs) && (res as any).jobs.length > 0) return (res as any).jobs;
  } catch {}
  return mockStore.getJobs();
}

export async function fetchJobById(id: string): Promise<Job> {
  try {
    return await apiClient<Job>(`/jobs/${id}`);
  } catch {
    const job = mockStore.getJob(id);
    if (job) return job;
    throw new Error(`Job ${id} not found`);
  }
}

export async function createJob(payload: CreateJobPayload): Promise<Job> {
  try {
    return await apiClient<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    return mockStore.addJob({
      source_connection_id: payload.source_connection_id,
      target_connection_id: payload.target_connection_id,
      source_sql: payload.source_sql,
      target_namespace: payload.target_namespace || 'default',
      target_table: payload.target_table || 'export_table',
      write_mode: payload.write_mode || 'append',
      incremental: payload.incremental ?? true,
      hwm_column: payload.hwm_column || 'id',
      options_json: payload.options_json || {},
    });
  }
}

export async function updateJob(id: string, payload: Partial<CreateJobPayload>): Promise<Job> {
  try {
    return await apiClient<Job>(`/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const job = mockStore.getJob(id);
    if (job) {
      Object.assign(job, payload);
      return job;
    }
    throw new Error(`Job ${id} not found`);
  }
}

export async function deleteJob(id: string): Promise<void> {
  try {
    await apiClient(`/jobs/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }
  mockStore.deleteJob(id);
}
