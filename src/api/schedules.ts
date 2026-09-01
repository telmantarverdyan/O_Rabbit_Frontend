import { apiClient } from './client';

export interface CronSchedule {
  id: string;
  name: string;
  jobId: string;
  cronExpr: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  created_at: string;
}

const STORAGE_KEY = 'orabbit_cron_schedules';

export async function fetchSchedules(): Promise<CronSchedule[]> {
  try {
    const res = await apiClient<CronSchedule[] | { schedules: CronSchedule[] }>('/schedules');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray((res as any).schedules)) return (res as any).schedules;
  } catch {
    // Fallback to /api/schedules
    try {
      const res = await apiClient<CronSchedule[]>('/api/schedules');
      if (Array.isArray(res)) return res;
    } catch {}
  }

  // Fallback to local storage persistence
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }

  const defaults: CronSchedule[] = [
    {
      id: 'sch-users-hourly',
      name: 'Sync Users CDC Incremental',
      jobId: 'job-users-sync',
      cronExpr: '0 * * * *',
      enabled: true,
      lastRunAt: new Date(Date.now() - 3600000).toISOString(),
      nextRunAt: new Date(Date.now() + 1800000).toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: 'sch-tx-nightly',
      name: 'Transactions Nightly Rollup',
      jobId: 'job-transactions-export',
      cronExpr: '0 2 * * *',
      enabled: true,
      lastRunAt: new Date(Date.now() - 86400000).toISOString(),
      nextRunAt: new Date(Date.now() + 43200000).toISOString(),
      created_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  return defaults;
}

export async function saveSchedule(schedule: Partial<CronSchedule>): Promise<CronSchedule> {
  const newSchedule: CronSchedule = {
    id: schedule.id || `sch-${Date.now()}`,
    name: schedule.name || 'Custom Cron Ingestion',
    jobId: schedule.jobId || 'default-job',
    cronExpr: schedule.cronExpr || '*/15 * * * *',
    enabled: schedule.enabled !== false,
    created_at: schedule.created_at || new Date().toISOString(),
    lastRunAt: schedule.lastRunAt,
    nextRunAt: schedule.nextRunAt || new Date(Date.now() + 900000).toISOString(),
  };

  try {
    return await apiClient<CronSchedule>('/api/schedules', {
      method: 'POST',
      body: JSON.stringify(newSchedule),
    });
  } catch {
    // Save to local storage fallback
    const current = await fetchSchedules();
    const index = current.findIndex((s) => s.id === newSchedule.id);
    if (index >= 0) {
      current[index] = newSchedule;
    } else {
      current.push(newSchedule);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return newSchedule;
  }
}

export async function toggleSchedule(id: string, enabled: boolean): Promise<boolean> {
  try {
    await apiClient(`/api/schedules/${id}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
    return true;
  } catch {
    const current = await fetchSchedules();
    const updated = current.map((s) => (s.id === id ? { ...s, enabled } : s));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return true;
  }
}

export async function deleteSchedule(id: string): Promise<boolean> {
  try {
    await apiClient(`/api/schedules/${id}`, { method: 'DELETE' });
    return true;
  } catch {
    const current = await fetchSchedules();
    const filtered = current.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }
}
