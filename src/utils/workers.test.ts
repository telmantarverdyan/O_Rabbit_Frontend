import { describe, it, expect } from 'vitest';
import { validateWorkerForm, workerConnection, workerGroupName, workerResources, WorkerForm } from './workers';

const base: WorkerForm = { serverId: 's1', name: '', scale: '1', cpus: '', memory: '', memoryUnit: 'g' };

describe('validateWorkerForm', () => {
  it('accepts the minimal form and sends only what is set', () => {
    expect(validateWorkerForm(base)).toEqual({ errors: {}, params: { scale: 1 } });
  });

  it('builds the full params', () => {
    const { params } = validateWorkerForm({ ...base, name: 'etl-a', scale: '3', cpus: '1.5', memory: '2', memoryUnit: 'g' });
    expect(params).toEqual({ scale: 3, name: 'etl-a', cpus: '1.5', memory: '2g' });
  });

  it.each([
    ['serverId', { serverId: '' }],
    ['name', { name: 'Etl' }],
    ['name', { name: '-etl' }],
    ['name', { name: 'a; rm -rf /' }],
    ['scale', { scale: '0' }],
    ['scale', { scale: '51' }],
    ['scale', { scale: '2.5' }],
    ['cpus', { cpus: '0.05' }],
    ['cpus', { cpus: '65' }],
    ['cpus', { cpus: '1.555' }],
    ['memory', { memory: '32', memoryUnit: 'm' as const }],
    ['memory', { memory: '513', memoryUnit: 'g' as const }],
    ['memory', { memory: '1.5', memoryUnit: 'g' as const }],
  ])('rejects an invalid %s', (field, patch) => {
    const { errors, params } = validateWorkerForm({ ...base, ...patch });
    expect(errors).toHaveProperty(field);
    expect(params).toBeUndefined();
  });
});

describe('workerConnection', () => {
  const now = Date.parse('2026-10-27T12:00:00Z');
  const at = (secondsAgo: number, status = 'ACTIVE') => ({ status, last_heartbeat: new Date(now - secondsAgo * 1000).toISOString() });

  it('derives Active, Inactive and Offline from the last heartbeat', () => {
    expect(workerConnection(at(5), now)).toBe('ACTIVE');
    expect(workerConnection(at(120), now)).toBe('INACTIVE');
    expect(workerConnection(at(3600), now)).toBe('OFFLINE');
  });

  it('treats a non-active status or a bad timestamp as offline', () => {
    expect(workerConnection(at(5, 'DRAINED'), now)).toBe('OFFLINE');
    expect(workerConnection({ status: 'ACTIVE', last_heartbeat: 'nope' }, now)).toBe('OFFLINE');
  });
});

describe('workerGroupName', () => {
  it('reads the deployment name from <name>-<container id>', () => {
    expect(workerGroupName('etl-a-1a2b3c4d5e6f')).toBe('etl-a');
    expect(workerGroupName('1a2b3c4d5e6f')).toBe('');
    expect(workerGroupName('worker-1')).toBe('');
  });
});

describe('workerResources', () => {
  it('lists what the worker reported', () => {
    expect(workerResources({ capabilities_json: { num_cpu: 4, memory_bytes: 2 * 1024 ** 3, os: 'linux', arch: 'amd64' } })).toBe('4 CPU · 2.0 GB · linux/amd64');
    expect(workerResources({ capabilities_json: null })).toBe('');
  });
});
