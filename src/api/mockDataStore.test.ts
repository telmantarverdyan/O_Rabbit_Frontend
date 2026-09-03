import { describe, it, expect, beforeEach } from 'vitest';
import { mockStore } from './mockDataStore';

describe('MockDataStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial connections and jobs correctly', () => {
    const connections = mockStore.getConnections();
    expect(connections.length).toBeGreaterThan(0);
    expect(connections.some((c) => c.engine === 'postgres')).toBe(true);

    const jobs = mockStore.getJobs();
    expect(jobs.length).toBeGreaterThan(0);
  });

  it('calculates status and leadership correctly', () => {
    const status = mockStore.getStatus();
    expect(status.status).toBe('HEALTHY');
    expect(status.version).toBe('1.4.2');
    expect(status.leadership?.active).toBe(true);
    expect(typeof status.active_runs).toBe('number');
    expect(typeof status.active_workers).toBe('number');
  });

  it('adds a run for an existing job and sets status to RUNNING', () => {
    const jobs = mockStore.getJobs();
    const targetJob = jobs[0];
    const initialRunsCount = mockStore.getRuns().length;

    const newRun = mockStore.addRun({ job_id: targetJob.id, status: 'RUNNING' });

    expect(newRun).toBeDefined();
    expect(newRun.job_id).toBe(targetJob.id);
    expect(newRun.status).toBe('RUNNING');
    expect(mockStore.getRuns().length).toBe(initialRunsCount + 1);
  });

  it('cancels an in-flight run', () => {
    const jobs = mockStore.getJobs();
    const newRun = mockStore.addRun({ job_id: jobs[0].id, status: 'RUNNING' });

    mockStore.cancelRun(newRun.id);

    const updatedRun = mockStore.getRun(newRun.id);
    expect(updatedRun?.status).toBe('CANCELED');
  });

  it('drains an active worker correctly', () => {
    const workers = mockStore.getWorkers();
    const worker = workers[0];

    mockStore.drainWorker(worker.id);

    const updatedWorkers = mockStore.getWorkers();
    const drained = updatedWorkers.find((w) => w.id === worker.id);
    expect(drained?.status).toBe('DRAINING');
  });
});
