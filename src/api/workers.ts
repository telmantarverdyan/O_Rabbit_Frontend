import { apiClient, postJSON } from './client';
import { JsonObject, Worker, WorkerIdentity } from './types';

/** Workers that heartbeated in the last 30s, or every known worker when all is true. */
export async function fetchWorkers(all = true): Promise<Worker[]> {
  return (await apiClient<Worker[]>(all ? 'workers?all=1' : 'workers')) ?? [];
}

export async function fetchWorkerIdentities(): Promise<WorkerIdentity[]> {
  return (await apiClient<WorkerIdentity[]>('workers/identities')) ?? [];
}

export interface EnrollmentTokenRequest {
  pool?: string;
  ttl_seconds?: number;
  max_uses?: number;
}

/** The returned token is shown once; the master stores only its hash. */
export function createEnrollmentToken(body: EnrollmentTokenRequest): Promise<JsonObject & { token: string }> {
  return postJSON<JsonObject & { token: string }>('workers/enrollment-tokens', body);
}

export function revokeWorkerIdentity(id: string): Promise<unknown> {
  return postJSON(`workers/identities/${encodeURIComponent(id)}/revoke`, {});
}
