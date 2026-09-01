import { Connection, Job, Run, Task, Worker, StatusInfo } from './types';

const STORE_KEY = 'orabbit_control_plane_store_v2';

export interface DataStoreState {
  connections: Connection[];
  jobs: Job[];
  runs: Run[];
  workers: Worker[];
}

const SEED_CONNECTIONS: Connection[] = [
  {
    id: 'conn-pg-01',
    name: 'postgres-prod-db',
    kind: 'source',
    engine: 'postgres',
    metadata_json: {
      dsn: 'postgres://admin:****@db.prod.internal:5432/ecommerce',
      host: 'db.prod.internal',
      port: 5432,
      database: 'ecommerce',
      sslmode: 'require',
    },
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'conn-ora-02',
    name: 'oracle-core-banking',
    kind: 'source',
    engine: 'oracle',
    metadata_json: {
      dsn: 'oracle://c##bank:****@oracle.corp.internal:1521/ORCL',
      host: 'oracle.corp.internal',
      port: 1521,
      service: 'ORCL',
    },
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'conn-mssql-03',
    name: 'mssql-erp-warehouse',
    kind: 'source',
    engine: 'mssql',
    metadata_json: {
      dsn: 'sqlserver://sa:****@mssql.corp.internal:1433?database=erp',
      host: 'mssql.corp.internal',
      port: 1433,
      database: 'erp',
    },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'conn-ch-04',
    name: 'clickhouse-analytics',
    kind: 'source',
    engine: 'clickhouse',
    metadata_json: {
      dsn: 'clickhouse://default:****@clickhouse.prod:9000/analytics',
      host: 'clickhouse.prod',
      port: 9000,
      database: 'analytics',
    },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'conn-s3-05',
    name: 's3-lakehouse-bucket',
    kind: 'target',
    engine: 's3',
    metadata_json: {
      endpoint: 'http://localhost:9000',
      bucket: 'lakehouse',
      region: 'us-east-1',
      prefix: 'raw',
      force_path_style: true,
    },
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const SEED_JOBS: Job[] = [
  {
    id: 'job-orders-01',
    source_connection_id: 'conn-pg-01',
    target_connection_id: 'conn-s3-05',
    target_table: 'orders',
    target_namespace: 'default',
    write_mode: 'append',
    incremental: true,
    hwm_column: 'created_at',
    options_json: {
      table: 'orders',
      source_mode: 'table',
      cursor_column: 'created_at',
      auto_tune: true,
      target_rows_per_task: 250000,
      iceberg: {
        enabled: true,
        namespace: 'default',
        table: 'orders',
      },
    },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'job-tx-02',
    source_connection_id: 'conn-ora-02',
    target_connection_id: 'conn-s3-05',
    target_table: 'transactions',
    target_namespace: 'default',
    write_mode: 'append',
    incremental: true,
    hwm_column: 'timestamp',
    options_json: {
      table: 'transactions',
      source_mode: 'table',
      cursor_column: 'timestamp',
      auto_tune: true,
      target_rows_per_task: 300000,
      iceberg: {
        enabled: true,
        namespace: 'default',
        table: 'transactions',
      },
    },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'job-users-03',
    source_connection_id: 'conn-pg-01',
    target_connection_id: 'conn-s3-05',
    target_table: 'users',
    target_namespace: 'default',
    write_mode: 'overwrite',
    incremental: false,
    hwm_column: 'id',
    options_json: {
      table: 'users',
      source_mode: 'table',
      cursor_column: 'id',
      auto_tune: true,
      target_rows_per_task: 170000,
      iceberg: {
        enabled: true,
        namespace: 'default',
        table: 'users',
      },
    },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'job-payments-04',
    source_connection_id: 'conn-mssql-03',
    target_connection_id: 'conn-s3-05',
    target_table: 'payments',
    target_namespace: 'default',
    write_mode: 'append',
    incremental: true,
    hwm_column: 'captured_at',
    options_json: {
      table: 'payments',
      source_mode: 'table',
      cursor_column: 'captured_at',
      auto_tune: true,
      target_rows_per_task: 280000,
      iceberg: {
        enabled: true,
        namespace: 'default',
        table: 'payments',
      },
    },
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

const SEED_WORKERS: Worker[] = [
  {
    id: 'node-pull-worker-01',
    addr: '10.0.4.11:9091',
    last_heartbeat: new Date(Date.now() - 3000).toISOString(),
    active_tasks: 3,
    capabilities_json: {
      hostname: 'worker-node-1.cluster.local',
      pid: 41209,
      os: 'linux',
      arch: 'amd64',
      cpus: 8,
      go_version: 'go1.22.4',
      version: 'v1.4.2',
    },
  },
  {
    id: 'node-pull-worker-02',
    addr: '10.0.4.12:9091',
    last_heartbeat: new Date(Date.now() - 2000).toISOString(),
    active_tasks: 4,
    capabilities_json: {
      hostname: 'worker-node-2.cluster.local',
      pid: 41210,
      os: 'linux',
      arch: 'amd64',
      cpus: 16,
      go_version: 'go1.22.4',
      version: 'v1.4.2',
    },
  },
  {
    id: 'node-pull-worker-03',
    addr: '10.0.4.13:9091',
    last_heartbeat: new Date(Date.now() - 4000).toISOString(),
    active_tasks: 2,
    capabilities_json: {
      hostname: 'worker-node-3.cluster.local',
      pid: 41211,
      os: 'linux',
      arch: 'amd64',
      cpus: 8,
      go_version: 'go1.22.4',
      version: 'v1.4.2',
    },
  },
  {
    id: 'node-pull-worker-04',
    addr: '10.0.4.14:9091',
    last_heartbeat: new Date(Date.now() - 6000).toISOString(),
    active_tasks: 0,
    capabilities_json: {
      hostname: 'worker-node-4.cluster.local',
      pid: 41212,
      os: 'linux',
      arch: 'amd64',
      cpus: 4,
      go_version: 'go1.22.4',
      version: 'v1.4.2',
    },
  },
];

function generateTasksForRun(runId: string, count: number, rowsTotal: number, bytesTotal: number, isRunning = false): Task[] {
  const tasks: Task[] = [];
  const rowsPerTask = Math.floor(rowsTotal / count);
  const bytesPerTask = Math.floor(bytesTotal / count);

  for (let i = 0; i < count; i++) {
    const isLastRunning = isRunning && i >= count - 2;
    tasks.push({
      id: `task-${runId.slice(-4)}-p${i}`,
      run_id: runId,
      worker_id: SEED_WORKERS[i % 3].id,
      status: isLastRunning ? 'RUNNING' : 'SUCCEEDED',
      partition_spec_json: {
        table: 'dataset',
        output_part: i,
        lower_bound: i * rowsPerTask,
        upper_bound: (i + 1) * rowsPerTask,
        lower_inclusive: true,
        upper_inclusive: false,
      },
      rows_read: isLastRunning ? Math.floor(rowsPerTask * 0.45) : rowsPerTask,
      bytes_written: isLastRunning ? Math.floor(bytesPerTask * 0.45) : bytesPerTask,
      parquet_objects_json: [
        {
          object_key: `raw/dataset/part-${String(i).padStart(4, '0')}-attempt-1.parquet`,
          byte_size: isLastRunning ? Math.floor(bytesPerTask * 0.45) : bytesPerTask,
          row_count: isLastRunning ? Math.floor(rowsPerTask * 0.45) : rowsPerTask,
          sha256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85${i}`,
        },
      ],
      created_at: new Date(Date.now() - 1000 * 60 * 30 + i * 5000).toISOString(),
      updated_at: new Date(Date.now() - 1000 * 60 * 10 + i * 5000).toISOString(),
    });
  }
  return tasks;
}

const SEED_RUNS: Run[] = [
  {
    id: 'run-9901-orders',
    job_id: 'job-orders-01',
    dataset_key: 'raw/orders',
    target_table: 'orders',
    status: 'SUCCEEDED',
    rows_total: 1940250,
    bytes_total: 246850000,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2.8).toISOString(),
    tasks: generateTasksForRun('run-9901-orders', 8, 1940250, 246850000),
  },
  {
    id: 'run-9902-transactions',
    job_id: 'job-tx-02',
    dataset_key: 'raw/transactions',
    target_table: 'transactions',
    status: 'SUCCEEDED',
    rows_total: 4820100,
    bytes_total: 580200000,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1.6).toISOString(),
    tasks: generateTasksForRun('run-9902-transactions', 16, 4820100, 580200000),
  },
  {
    id: 'run-9903-users',
    job_id: 'job-users-03',
    dataset_key: 'raw/users',
    target_table: 'users',
    status: 'SUCCEEDED',
    rows_total: 680240,
    bytes_total: 84500000,
    created_at: new Date(Date.now() - 3600000 * 1.5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1.3).toISOString(),
    tasks: generateTasksForRun('run-9903-users', 4, 680240, 84500000),
  },
  {
    id: 'run-9904-payments',
    job_id: 'job-payments-04',
    dataset_key: 'raw/payments',
    target_table: 'payments',
    status: 'RUNNING',
    rows_total: 2310000,
    bytes_total: 310800000,
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updated_at: new Date().toISOString(),
    tasks: generateTasksForRun('run-9904-payments', 8, 2310000, 310800000, true),
  },
  {
    id: 'run-9905-audit-logs',
    job_id: 'job-audit-05',
    dataset_key: 'raw/audit_logs',
    target_table: 'audit_logs',
    status: 'COMMITTING',
    rows_total: 12450000,
    bytes_total: 1480000000,
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    updated_at: new Date().toISOString(),
    tasks: generateTasksForRun('run-9905-audit-logs', 24, 12450000, 1480000000),
  },
];

class MockDataStore {
  private state: DataStoreState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DataStoreState {
    try {
      const serialized = localStorage.getItem(STORE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        if (parsed && Array.isArray(parsed.connections) && parsed.connections.length > 0) {
          return parsed;
        }
      }
    } catch {}

    const fresh: DataStoreState = {
      connections: SEED_CONNECTIONS,
      jobs: SEED_JOBS,
      runs: SEED_RUNS,
      workers: SEED_WORKERS,
    };
    this.saveState(fresh);
    return fresh;
  }

  private saveState(state: DataStoreState) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch {}
    this.state = state;
  }

  // Connections CRUD
  getConnections(): Connection[] {
    return this.state.connections;
  }

  getConnection(id: string): Connection | undefined {
    return this.state.connections.find((c) => c.id === id);
  }

  addConnection(conn: Omit<Connection, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Connection {
    const newConn: Connection = {
      ...conn,
      id: conn.id || `conn-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const next = {
      ...this.state,
      connections: [newConn, ...this.state.connections],
    };
    this.saveState(next);
    return newConn;
  }

  deleteConnection(id: string): void {
    const next = {
      ...this.state,
      connections: this.state.connections.filter((c) => c.id !== id),
    };
    this.saveState(next);
  }

  // Jobs CRUD
  getJobs(): Job[] {
    return this.state.jobs;
  }

  getJob(id: string): Job | undefined {
    return this.state.jobs.find((j) => j.id === id);
  }

  addJob(job: Omit<Job, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Job {
    const newJob: Job = {
      ...job,
      id: job.id || `job-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const next = {
      ...this.state,
      jobs: [newJob, ...this.state.jobs],
    };
    this.saveState(next);
    return newJob;
  }

  deleteJob(id: string): void {
    const next = {
      ...this.state,
      jobs: this.state.jobs.filter((j) => j.id !== id),
    };
    this.saveState(next);
  }

  // Runs CRUD
  getRuns(): Run[] {
    return this.state.runs;
  }

  getRun(id: string): Run | undefined {
    return this.state.runs.find((r) => r.id === id);
  }

  addRun(run: Partial<Run>): Run {
    const runId = run.id || `run-${Date.now().toString(36)}`;
    const rows = run.rows_total || 250000;
    const bytes = run.bytes_total || Math.floor(rows * 128);
    const newRun: Run = {
      id: runId,
      job_id: run.job_id || 'job-adhoc',
      dataset_key: run.dataset_key || `raw/${run.target_table || 'orders'}`,
      target_table: run.target_table || 'orders',
      status: run.status || 'RUNNING',
      rows_total: rows,
      bytes_total: bytes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      tasks: generateTasksForRun(runId, 6, rows, bytes, true),
    };
    const next = {
      ...this.state,
      runs: [newRun, ...this.state.runs],
    };
    this.saveState(next);
    return newRun;
  }

  cancelRun(id: string): void {
    const next = {
      ...this.state,
      runs: this.state.runs.map((r) => (r.id === id ? { ...r, status: 'CANCELED' as const } : r)),
    };
    this.saveState(next);
  }

  retryTask(runId: string, taskId: string): void {
    const next = {
      ...this.state,
      runs: this.state.runs.map((r) => {
        if (r.id === runId && r.tasks) {
          return {
            ...r,
            tasks: r.tasks.map((t) => (t.id === taskId ? { ...t, status: 'RUNNING' as const } : t)),
          };
        }
        return r;
      }),
    };
    this.saveState(next);
  }

  // Workers
  getWorkers(): Worker[] {
    return this.state.workers;
  }

  drainWorker(workerId: string): void {
    const next = {
      ...this.state,
      workers: this.state.workers.map((w) => (w.id === workerId ? { ...w, status: 'DRAINING' as const } : w)),
    };
    this.saveState(next);
  }

  // Status
  getStatus(): StatusInfo {
    const totalRows = this.state.runs.reduce((acc, r) => acc + (r.rows_total || 0), 0);
    const totalBytes = this.state.runs.reduce((acc, r) => acc + (r.bytes_total || 0), 0);
    return {
      pid: 80418,
      http_addr: 'http://localhost:8080',
      grpc_addr: 'localhost:9090',
      db_path: './orabbit_meta.db',
      status: 'HEALTHY',
      version: '1.4.2',
      git_commit: 'e89d12a',
      uptime_seconds: 412500,
      active_runs: this.state.runs.filter((r) => r.status === 'RUNNING').length,
      active_workers: this.state.workers.filter((w) => w.status === 'ONLINE').length,
      total_rows_extracted: totalRows,
      total_bytes_written: totalBytes,
      leadership: {
        active: true,
        epoch: 4,
        leader_id: 'master-node-01',
      },
    };
  }
}

export const mockStore = new MockDataStore();
