import { apiClient, apiRequest, Session } from './client';
import { MasterStatus } from './types';

/** GET /status (needs the API token). Pass a session to test credentials before saving them. */
export async function fetchStatus(session?: Session): Promise<MasterStatus> {
  if (session) return (await apiRequest<MasterStatus>('/status', {}, session)).data;
  return apiClient<MasterStatus>('/status');
}

