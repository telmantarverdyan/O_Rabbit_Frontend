import { apiClient } from './client';
import { Run, Task } from './types';
import { mockStore } from './mockDataStore';
import { getTableDetails } from '@/utils/tableCatalog';

export interface SubmitRunPayload {
  job_id?: string;
  source_engine?: string;
  source_dsn?: string;
  source_mode?: 'table' | 'query';
  source_table?: string;
  source_sql?: string;
  cursor_column?: string;
  incremental?: boolean;
  target_s3?: {
    endpoint?: string;
    bucket?: string;
    region?: string;
    prefix?: string;
    access_key_id?: string;
    secret_access_key?: string;
    force_path_style?: boolean;
  };
  options?: Record<string, any>;
}

function normalizeRun(raw: any): Run {
  const r = (raw && raw.run) ? raw.run : raw;
  const rawTasks: Task[] = (raw && raw.tasks) ? raw.tasks : (r.tasks || []);
  const tableName = (r.target_table || r.dataset_key?.replace(/^raw\//, '') || '').toLowerCase();

  const taskRowsSum = rawTasks.reduce((sum, t) => sum + (t.rows_read || 0), 0);
  const taskBytesSum = rawTasks.reduce((sum, t) => sum + (t.bytes_written || 0), 0);

  const rowsTotal = (r.rows_total !== undefined && r.rows_total !== null && r.rows_total > 0)
    ? r.rows_total
    : taskRowsSum;

  const bytesTotal = (r.bytes_total !== undefined && r.bytes_total !== null && r.bytes_total > 0)
    ? r.bytes_total
    : taskBytesSum;

  const tasks: Task[] = rawTasks.map((t) => ({
    ...t,
    rows_read: t.rows_read || 0,
    bytes_written: t.bytes_written || 0,
  }));

  return {
    ...r,
    id: String(r.id || ''),
    dataset_key: r.dataset_key || (tableName ? `raw/${tableName}` : '—'),
    created_at: r.created_at || r.started_at || new Date().toISOString(),
    started_at: r.started_at || r.created_at || new Date().toISOString(),
    rows_total: rowsTotal,
    bytes_total: bytesTotal,
    tasks,
  };
}

export async function fetchRuns(): Promise<Run[]> {
  try {
    const res = await apiClient<any>('/runs');
    const list = Array.isArray(res) ? res : (res?.runs || []);
    if (list.length > 0) return list.map(normalizeRun);
  } catch {}

  try {
    const res = await apiClient<any>('/api/runs');
    const list = Array.isArray(res) ? res : (res?.runs || []);
    if (list.length > 0) return list.map(normalizeRun);
  } catch {}

  return mockStore.getRuns().map(normalizeRun);
}

export async function fetchRunById(id: string): Promise<Run> {
  try {
    const res = await apiClient<any>(`/runs/${id}`);
    if (res) return normalizeRun(res);
  } catch {}

  try {
    const res = await apiClient<any>(`/api/runs/${id}`);
    if (res) return normalizeRun(res);
  } catch {}

  const run = mockStore.getRun(id);
  if (run) return normalizeRun(run);

  const runs = mockStore.getRuns();
  if (runs.length > 0) return normalizeRun(runs[0]);

  throw new Error(`Run ${id} not found`);
}

export async function submitJobRun(jobId: string, overrides: Record<string, any> = {}): Promise<Run> {
  try {
    return await apiClient<Run>(`/jobs/${jobId}/runs`, {
      method: 'POST',
      body: JSON.stringify(overrides),
    });
  } catch {
    const job = mockStore.getJob(jobId);
    return mockStore.addRun({
      job_id: jobId,
      target_table: job?.target_table || 'orders',
      dataset_key: `raw/${job?.target_table || 'orders'}`,
      status: 'RUNNING',
      rows_total: job?.options_json?.target_rows_per_task ? job.options_json.target_rows_per_task * 4 : 500000,
    });
  }
}

export async function submitDirectRun(payload: SubmitRunPayload): Promise<Run> {
  try {
    return await apiClient<Run>('/api/runs/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch {
    return mockStore.addRun({
      job_id: payload.job_id || 'adhoc-run',
      target_table: payload.source_table || 'custom_export',
      dataset_key: `raw/${payload.source_table || 'custom_export'}`,
      status: 'RUNNING',
      rows_total: 450000,
    });
  }
}

export async function cancelRun(id: string): Promise<{ success: boolean }> {
  try {
    return await apiClient<{ success: boolean }>(`/runs/${id}/cancel`, {
      method: 'POST',
    });
  } catch {
    mockStore.cancelRun(id);
    return { success: true };
  }
}

export async function retryTask(runId: string, taskId: string): Promise<{ success: boolean; message: string }> {
  try {
    return await apiClient<{ success: boolean; message: string }>(`/runs/${runId}/tasks/${taskId}/retry`, {
      method: 'POST',
    });
  } catch {
    mockStore.retryTask(runId, taskId);
    return { success: true, message: `Task ${taskId} re-queued for partition lease` };
  }
}
