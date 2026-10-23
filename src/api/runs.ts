import { apiClient, apiRequest, postJSON } from './client';
import {
  RecoveryAction,
  RecoveryResult,
  Run,
  RunArtifacts,
  RunDiagnosis,
  RunEventsPage,
  RunProgress,
  RunSubmitRequest,
  RunSubmitted,
  RunValidation,
  RunWithTasks,
} from './types';

export interface RunsPage {
  runs: Run[];
  nextCursor: string;
}

/** GET /runs, newest first. The next page cursor comes back in X-Next-Cursor. */
export async function fetchRuns(limit = 50, cursor = ''): Promise<RunsPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  const { data, headers } = await apiRequest<Run[]>(`runs?${params}`);
  return { runs: data ?? [], nextCursor: headers.get('X-Next-Cursor') || '' };
}

export function fetchRun(id: string): Promise<RunWithTasks> {
  return apiClient<RunWithTasks>(`runs/${encodeURIComponent(id)}`);
}

export function fetchRunProgress(id: string): Promise<RunProgress> {
  return apiClient<RunProgress>(`runs/${encodeURIComponent(id)}/progress`);
}

export function fetchRunEvents(id: string, limit = 500): Promise<RunEventsPage> {
  return apiClient<RunEventsPage>(`runs/${encodeURIComponent(id)}/events?limit=${limit}`);
}

export function fetchRunArtifacts(id: string): Promise<RunArtifacts> {
  return apiClient<RunArtifacts>(`runs/${encodeURIComponent(id)}/artifacts`);
}

export function fetchRunDiagnosis(id: string): Promise<RunDiagnosis> {
  return apiClient<RunDiagnosis>(`runs/${encodeURIComponent(id)}/diagnosis`);
}

export function cancelRun(id: string): Promise<Run> {
  return postJSON<Run>(`runs/${encodeURIComponent(id)}/cancel`, {});
}

export function recoverRun(id: string, action: RecoveryAction, reason: string): Promise<RecoveryResult> {
  return postJSON<RecoveryResult>(`runs/${encodeURIComponent(id)}/recover`, { action, reason });
}

/** Retries Iceberg registration; config_yaml replaces the stored config only when override is true. */
export function retryRegistration(id: string, configYaml = ''): Promise<unknown> {
  return postJSON(`runs/${encodeURIComponent(id)}/registration/retry`, {
    override_config: configYaml.trim() !== '',
    config_yaml: configYaml,
  });
}

export function cancelRegistration(id: string): Promise<unknown> {
  return postJSON(`runs/${encodeURIComponent(id)}/registration/cancel`, {});
}

/** Checks a one-shot submission without starting it. */
export function validateRun(req: RunSubmitRequest): Promise<RunValidation> {
  return postJSON<RunValidation>('runs/validate', req);
}

/** Validates, stores and starts a one-shot run. */
export function submitRun(req: RunSubmitRequest): Promise<RunSubmitted> {
  return postJSON<RunSubmitted>('runs/submit', req);
}

/** Starts a stored job. registration_config optionally overrides its Iceberg settings. */
export function startJobRun(jobId: string, registrationConfig?: unknown): Promise<RunWithTasks> {
  return postJSON<RunWithTasks>(
    `jobs/${encodeURIComponent(jobId)}/runs`,
    registrationConfig === undefined ? {} : { registration_config: registrationConfig }
  );
}
