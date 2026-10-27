import { Worker, WorkerDeploymentParams } from '@/api/types';

// ---- Worker deployment settings. Keep in sync with NormalizeWorkerSettings in
// O_Rabbit/internal/ops/deploy/service.go: the UI checks first so mistakes show
// next to the field, and the master checks again before anything runs. ----

export const WORKER_NAME_PATTERN = /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/;
const CPUS_PATTERN = /^[0-9]{1,2}(\.[0-9]{1,2})?$/;
export const MAX_WORKER_SCALE = 50;
export const MIN_WORKER_CPUS = 0.1;
export const MAX_WORKER_CPUS = 64;
export const MIN_WORKER_MEMORY_MB = 64;
export const MAX_WORKER_MEMORY_MB = 512 * 1024;

export interface WorkerForm {
  serverId: string;
  name: string;
  scale: string;
  cpus: string;
  memory: string;
  memoryUnit: 'm' | 'g';
}

export type WorkerFormErrors = Partial<Record<keyof WorkerForm, string>>;

/** Validates the form; returns per-field errors and, when valid, the API params. */
export function validateWorkerForm(form: WorkerForm): { errors: WorkerFormErrors; params?: WorkerDeploymentParams } {
  const errors: WorkerFormErrors = {};
  const name = form.name.trim();
  const scale = form.scale.trim();
  const cpus = form.cpus.trim();
  const memory = form.memory.trim();

  if (!form.serverId) errors.serverId = 'Choose the server to run the workers on.';
  if (name && !WORKER_NAME_PATTERN.test(name)) {
    errors.name = 'Use 1–32 lowercase letters, digits or dashes, starting and ending with a letter or digit.';
  }
  const scaleNum = Number(scale);
  if (!/^\d+$/.test(scale) || scaleNum < 1 || scaleNum > MAX_WORKER_SCALE) {
    errors.scale = `Enter a whole number from 1 to ${MAX_WORKER_SCALE}.`;
  }
  if (cpus) {
    const n = Number(cpus);
    if (!CPUS_PATTERN.test(cpus) || n < MIN_WORKER_CPUS || n > MAX_WORKER_CPUS) {
      errors.cpus = `Enter ${MIN_WORKER_CPUS}–${MAX_WORKER_CPUS} CPUs, at most two decimals (for example 1.5).`;
    }
  }
  if (memory) {
    const n = Number(memory);
    const mb = form.memoryUnit === 'g' ? n * 1024 : n;
    if (!/^\d{1,6}$/.test(memory) || mb < MIN_WORKER_MEMORY_MB || mb > MAX_WORKER_MEMORY_MB) {
      errors.memory = `Enter a whole number between ${MIN_WORKER_MEMORY_MB} MB and ${MAX_WORKER_MEMORY_MB / 1024} GB.`;
    }
  }
  if (Object.keys(errors).length) return { errors };

  return {
    errors,
    params: {
      scale: scaleNum,
      ...(name ? { name } : {}),
      ...(cpus ? { cpus } : {}),
      ...(memory ? { memory: `${Number(memory)}${form.memoryUnit}` } : {}),
    },
  };
}

// ---- Displaying workers ----

export type WorkerConnection = 'ACTIVE' | 'INACTIVE' | 'OFFLINE';

/** The master treats a worker as active when it heartbeated in the last 30 seconds. */
export const ACTIVE_WINDOW_MS = 30_000;
export const INACTIVE_WINDOW_MS = 5 * 60_000;

export function workerConnection(worker: Pick<Worker, 'status' | 'last_heartbeat'>, now = Date.now()): WorkerConnection {
  const age = now - new Date(worker.last_heartbeat).getTime();
  if (!Number.isFinite(age) || worker.status.toUpperCase() !== 'ACTIVE') return 'OFFLINE';
  if (age <= ACTIVE_WINDOW_MS) return 'ACTIVE';
  if (age <= INACTIVE_WINDOW_MS) return 'INACTIVE';
  return 'OFFLINE';
}

/**
 * Deployed workers are named `<name>-<container id>` (a 12-hex Docker hostname),
 * so the group name can be read back from the ID. Returns '' when there is none.
 */
export function workerGroupName(workerId: string): string {
  const m = /^(.+)-[0-9a-f]{12}$/.exec(workerId);
  return m ? m[1] : '';
}

export function formatMemory(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(gb >= 10 ? 0 : 1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

/** "4 CPU · 2.0 GB · linux/amd64", leaving out what the worker did not report. */
export function workerResources(worker: Pick<Worker, 'capabilities_json'>): string {
  const c = worker.capabilities_json ?? {};
  return [
    c.num_cpu ? `${c.num_cpu} CPU` : '',
    formatMemory(c.memory_bytes),
    c.os && c.arch ? `${c.os}/${c.arch}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
