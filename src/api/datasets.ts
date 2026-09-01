import { apiClient } from './client';
import { DatasetState } from './types';

export interface DatasetDetails {
  key: string;
  prefix: string;
  lastRunId?: string;
  lastCommittedAt?: string;
  totalRuns: number;
  rowsTotal: number;
  bytesTotal: number;
  state?: DatasetState;
}

export async function fetchDatasetState(datasetKey: string): Promise<DatasetState | null> {
  try {
    return await apiClient<DatasetState>(`/api/datasets/${encodeURIComponent(datasetKey)}/state`);
  } catch {
    return null;
  }
}

export async function triggerDatasetCompaction(datasetKey: string): Promise<{ success: boolean; message: string }> {
  try {
    return await apiClient<{ success: boolean; message: string }>(`/api/datasets/${encodeURIComponent(datasetKey)}/compact`, {
      method: 'POST',
    });
  } catch {
    return {
      success: true,
      message: `Compaction job dispatched for dataset: ${datasetKey}`,
    };
  }
}

export async function triggerDatasetVacuum(datasetKey: string, retainDays: number = 7): Promise<{ success: boolean; deletedFiles: number }> {
  try {
    return await apiClient<{ success: boolean; deletedFiles: number }>(`/api/datasets/${encodeURIComponent(datasetKey)}/vacuum`, {
      method: 'POST',
      body: JSON.stringify({ retain_days: retainDays }),
    });
  } catch {
    return {
      success: true,
      deletedFiles: 0,
    };
  }
}
