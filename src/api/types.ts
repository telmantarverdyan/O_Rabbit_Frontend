export type RunStatus = 'PLANNING' | 'RUNNING' | 'COMMITTING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'QUARANTINED';
export type ConnectionKind = 'source' | 'target';

export interface Connection {
  id: string;
  name?: string;
  kind: ConnectionKind;
  engine: string;
  metadata_json: Record<string, any>;
  secret?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface JobOptions {
  table?: string;
  query?: string;
  source_name?: string;
  source_mode?: 'table' | 'query';
  cursor_column?: string;
  id_column?: string;
  auto_tune?: boolean;
  planned_tasks?: number;
  max_in_flight_tasks?: number;
  fetch_limit_rows?: number;
  target_rows_per_task?: number;
  target_file_bytes?: number;
  max_rows_per_file?: number;
  iceberg?: {
    enabled?: boolean;
    engine?: 'rest-go' | 'ice';
    catalog_uri?: string;
    warehouse?: string;
    table?: string;
    namespace?: string;
  };
  [key: string]: any;
}

export interface Job {
  id: string;
  source_connection_id: string;
  target_connection_id: string;
  source_sql?: string;
  target_namespace?: string;
  target_table?: string;
  write_mode?: string;
  incremental: boolean;
  hwm_column?: string;
  options_json: JobOptions;
  created_at: string;
  updated_at: string;
}

export interface ParquetObject {
  object_key: string;
  byte_size?: number;
  row_count?: number;
  sha256?: string;
  schema_fingerprint?: string;
  part?: number;
  file_index?: number;
  attempt_number?: number;
}

export interface TaskPartitionSpec {
  table?: string;
  cursor_column?: string;
  cursor_domain?: string;
  lower_bound?: string | number;
  upper_bound?: string | number;
  lower_inclusive?: boolean;
  upper_inclusive?: boolean;
  output_part?: number;
  [key: string]: any;
}

export interface Task {
  id: string;
  run_id: string;
  worker_id?: string;
  status: TaskStatus;
  partition_spec_json: TaskPartitionSpec;
  rows_read?: number;
  bytes_written?: number;
  parquet_objects_json?: ParquetObject[] | string;
  failure_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  job_id: string;
  status: RunStatus;
  dataset_key?: string;
  correlation_id?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  rows_total?: number;
  bytes_total?: number;
  tasks?: Task[];
  objects?: ParquetObject[];
  [key: string]: any;
}

export interface WorkerCapabilities {
  hostname?: string;
  pid?: number;
  os?: string;
  arch?: string;
  cpus?: number;
  go_version?: string;
  version?: string;
  [key: string]: any;
}

export interface Worker {
  id: string;
  addr: string;
  last_heartbeat: string;
  capabilities_json: WorkerCapabilities;
  active_tasks?: number;
  status?: string;
  [key: string]: any;
}

export interface StatusInfo {
  pid: number;
  http_addr: string;
  grpc_addr: string;
  db_path: string;
  status?: string;
  version?: string;
  git_commit?: string;
  uptime_seconds?: number;
  active_runs?: number;
  active_workers?: number;
  total_rows_extracted?: number;
  total_bytes_written?: number;
  leadership?: {
    active: boolean;
    epoch: number;
    leader_id?: string;
  };
  [key: string]: any;
}

export interface RunEvent {
  id: string;
  run_id: string;
  task_id?: string;
  ts: string;
  level: string;
  message: string;
  fields_json?: Record<string, any> | string;
}

export interface DatasetState {
  dataset_key: string;
  prefix: string;
  max_hwm_value?: string;
  max_part?: number;
  next_part?: number;
  last_committed_run_id?: string;
  committed_at?: string;
}
