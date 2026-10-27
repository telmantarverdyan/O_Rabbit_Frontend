// Types mirror the JSON produced by the O_Rabbit master
// (../O_Rabbit/internal/db and ../O_Rabbit/internal/http). Keep them in sync.

export type RunStatus = 'PLANNING' | 'RUNNING' | 'COMMITTING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED' | 'QUARANTINED';
export type ConnectionKind = 'source' | 'target';

/** A JSON object whose shape the backend does not fix. */
export type JsonObject = Record<string, unknown>;

export interface Leadership {
  instance_id: string;
  leadership_state: string;
  leadership_epoch: number;
  lease_deadline_unix_ms: number;
  last_successful_renewal_unix_ms: number;
  ready: boolean;
}

/** GET /status. The base fields come from StatusInfo, so keep them loose. */
export interface MasterStatus extends JsonObject {
  leadership?: Leadership;
}

export interface Connection {
  id: string;
  name: string;
  kind: ConnectionKind;
  engine: string;
  metadata_json: JsonObject | null;
  created_at: string;
  updated_at: string;
}

/** POST /connections, PUT /connections/{id}. `secret` is encrypted at rest and never returned. */
export interface ConnectionRequest {
  name: string;
  kind: ConnectionKind;
  engine: string;
  metadata?: JsonObject;
  secret?: JsonObject;
}

export interface Job {
  id: string;
  name: string;
  source_connection_id: string;
  target_connection_id: string;
  source_sql: string;
  target_namespace: string;
  target_table: string;
  write_mode: string;
  incremental: boolean;
  hwm_column: string | null;
  options_json: JsonObject | null;
  created_at: string;
  updated_at: string;
}

export type JobRequest = Omit<Job, 'id' | 'created_at' | 'updated_at'>;

/** A column whose source type had no exact Parquet mapping (typesystem.TypeWarning). */
export interface TypeWarning {
  column: string;
  source_type?: string;
  logical_type: string;
  storage_type: string;
  target_type?: string;
  class: string;
  reason: string;
}

export interface Run {
  id: string;
  job_id: string;
  dataset_key?: string;
  status: RunStatus;
  correlation_id: string;
  started_at: string;
  finished_at: string | null;
  error_summary: string | null;
  failure_class?: string;
  failure_phase?: '' | 'planning' | 'extract' | 'commit';
  type_warnings: TypeWarning[] | null;
  commit_id?: string;
  commit_phase?: string;
  operator_action_required: boolean;
  data_status?: string;
  catalog_status?: string;
  readiness?: string;
  registration_id?: string;
  registration_attempt: number;
  registration_error_class?: string;
  registration_next_retry_at?: string | null;
  registration_blocked_by?: string;
  registered_snapshot_or_metadata_id?: string;
}

export interface Task {
  id: string;
  run_id: string;
  task_index: number;
  partition_spec_json: unknown;
  worker_id: string | null;
  status: TaskStatus;
  rows_read: number;
  bytes_read: number;
  bytes_written: number;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  attempt_count: number;
  next_eligible_at?: string | null;
  failure_class?: string;
  artifact_count: number;
  artifact_bytes: number;
  artifact_rows: number;
}

/** GET /runs/{id} and POST /jobs/{id}/runs. */
export interface RunWithTasks {
  run: Run;
  tasks: Task[];
}

export interface RunProgress {
  run_id: string;
  status: RunStatus;
  progress: {
    tasks_total: number;
    tasks_pending: number;
    tasks_running: number;
    tasks_succeeded: number;
    tasks_failed: number;
    tasks_canceled: number;
    rows_read: number;
    bytes_written: number;
    workers_active: number;
  };
}

export interface RunEvent {
  id: string;
  run_id: string;
  task_id?: string | null;
  ts: string;
  level: string;
  message: string;
  fields_json?: unknown;
}

export interface RunEventsPage {
  items: RunEvent[];
  next_cursor: string;
}

export interface RunArtifact {
  task_id: string;
  [key: string]: unknown;
}

export interface RunArtifacts {
  run_id: string;
  objects: RunArtifact[];
}

export interface RunDiagnosis {
  run_id: string;
  status: RunStatus;
  commit_phase?: string;
  commit_age_seconds?: number;
  last_classified_error?: string;
  task_counts: Record<string, number>;
  blocking_tasks?: JsonObject[];
  registration?: JsonObject;
  operator_review_required: boolean;
  suggested_next_action: string;
  generated_at: string;
}

/** Actions accepted by POST /runs/{id}/recover. */
export type RecoveryAction = 'reconcile_commit' | 'registration_retry' | 'reconciliation_retry';

export interface RecoveryResult {
  action: string;
  changed: boolean;
  status: string;
  message: string;
}

/** Free-form data a worker reports about itself (cmd/worker/main.go). */
export interface WorkerCapabilities {
  go?: string;
  os?: string;
  arch?: string;
  num_cpu?: number;
  memory_bytes?: number;
  [key: string]: unknown;
}

export interface WorkerInstance {
  boot_id: string;
  worker_id: string;
  hostname: string;
  pid: number;
  version: string;
  status: string;
  started_at: string;
  last_heartbeat: string;
}

export interface Worker {
  id: string;
  addr: string;
  status: string;
  last_heartbeat: string;
  capabilities_json: WorkerCapabilities | null;
  instances: WorkerInstance[] | null;
  /** Tasks this worker holds a lease on. Missing on masters older than this field. */
  running_tasks?: number;
}

// ---- Remote operations (separate ORABBIT_REMOTE_OPS_AUTH_TOKEN) ----

export interface Server {
  id: string;
  name: string;
  host: string;
  ssh_port: number;
  ssh_user: string;
  project_dir: string;
  role_hints: string[];
  labels: Record<string, string>;
  last_seen_at: string | null;
  last_error: string | null;
}

export type ServerAuthType = 'private_key' | 'password';

export interface ServerCreateRequest {
  name: string;
  host: string;
  ssh_port: number;
  ssh_user: string;
  project_dir: string;
  role_hints?: string[];
  credential: {
    auth_type: ServerAuthType;
    username?: string;
    private_key?: string;
    passphrase?: string;
    password?: string;
    host_key_fingerprint: string;
  };
}

export interface SshTestResult {
  ok: boolean;
  latency_ms: number;
  remote_user: string;
  hostname: string;
  host_key_fingerprint: string;
}

export interface ProjectValidation {
  ok: boolean;
  project_dir: string;
  files: Record<string, boolean>;
  errors: string[] | null;
}

/** POST /deployments params for component "worker" (see O_Rabbit/internal/ops/deploy). */
export interface WorkerDeploymentParams {
  scale?: number;
  name?: string;
  cpus?: string;
  memory?: string;
}

export interface Deployment {
  id: string;
  server_id: string;
  component: string;
  script_id: string;
  status: string;
  execution_id?: string;
  started_at?: string | null;
  finished_at?: string | null;
  error?: string | null;
}

/** One event on /deployments/{id}/events/stream. */
export interface OpsStreamEvent {
  type: string;
  stream_id: string;
  sequence: number;
  timestamp: string;
  level: string;
  data?: { line?: string; status?: string; exit_code?: number; error?: string; [key: string]: unknown };
}

export interface SourceEngine {
  engine: string;
  table_mode_supported: boolean;
  ordered_cursor_supported: boolean;
  query_supported: boolean;
  query_languages?: string[];
  query_incremental_supported?: boolean;
  query_schema_inference_supported?: boolean;
  oneshot_submit_supported?: boolean;
}

export type IcebergEngine = 'rest-go' | 'ice';
export type ConsistencyMode = 'EVENTUAL' | 'STRONG_SNAPSHOT' | 'STRONG_CDC';

/** POST /runs/validate and POST /runs/submit (RunSubmitRequest in docs/openapi.yaml). */
export interface RunSubmitRequest {
  source: {
    engine: string;
    dsn: string;
    mode?: 'table' | 'query';
    table?: string;
    query?: string;
    cursor_column?: string;
    incremental?: boolean;
    where_clause?: string;
    select_columns?: string[];
    column_types?: Record<string, string>;
    record_path?: string;
    format?: string;
  };
  target: {
    s3_endpoint?: string;
    s3_region?: string;
    s3_bucket?: string;
    s3_prefix?: string;
    s3_force_path_style?: boolean;
    s3_access_key_id?: string;
    s3_secret_access_key?: string;
  };
  performance?: {
    auto_tune?: boolean;
    max_in_flight_tasks?: number;
    planned_tasks?: number;
    target_rows_per_task?: number;
    target_file_bytes?: number;
  };
  iceberg?: {
    enabled?: boolean;
    engine?: IcebergEngine;
    table?: string;
    config_yaml?: string;
    options?: JsonObject;
    partition_keys?: string[];
  };
  consistency?: { mode?: ConsistencyMode };
  worker_pool?: string;
}

/** POST /runs/validate: what the master derived from the request, plus the inferred schema. */
export interface RunValidation {
  ok: boolean;
  source_engine: string;
  source_mode: string;
  available_workers: number;
  type_mappings: Array<{ column: string; logical_type: string; storage_type: string; target_type: string; fallback?: boolean; reason?: string }>;
  type_warnings: TypeWarning[];
  derived: JsonObject;
}

export interface RunSubmitted {
  run_id: string;
  job_id: string;
  status: string;
  events_url: string;
  run_url: string;
}


export interface WorkerIdentity {
  id: string;
  name: string;
  hostname: string;
  pool: string;
  status: string;
  cert_serial: string;
  cert_not_after: string;
  enrollment_token_id: string;
  enrolled_at: string;
  updated_at: string;
  revoked_at?: string | null;
}
