import { apiClient, postJSON, putJSON } from './client';
import { Job, JobRequest } from './types';

export async function fetchJobs(): Promise<Job[]> {
  return (await apiClient<Job[]>('jobs')) ?? [];
}

export function createJob(req: JobRequest): Promise<Job> {
  return postJSON<Job>('jobs', req);
}

export function updateJob(id: string, req: JobRequest): Promise<Job> {
  return putJSON<Job>(`jobs/${encodeURIComponent(id)}`, req);
}

export function deleteJob(id: string): Promise<void> {
  return apiClient<void>(`jobs/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
