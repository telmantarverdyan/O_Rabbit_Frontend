// Runs an orabbit-client run file (`orabbit-client run submit --file run.yaml`)
// from the browser, the same way the CLI does: upsert the source and target
// connections and the job by name, then start the job.
// Mirrors O_Rabbit/internal/orabbitcli/runsubmit.go (validate,
// buildJobPayloadFromConfig, prepareRunPlan, submitRunPlan). Keep them in sync.

import { createConnection, fetchConnections, updateConnection } from '@/api/connections';
import { createJob, fetchJobs, updateJob } from '@/api/jobs';
import { startJobRun } from '@/api/runs';
import { ConnectionRequest, JobRequest, JsonObject, RunWithTasks, SourceEngine } from '@/api/types';
import { parseYaml } from '@/utils/simpleYaml';

export interface CliRunPlan {
  sourceConnection: ConnectionRequest;
  targetConnection: ConnectionRequest;
  /** Job without its connection IDs, which are known only after the upserts. */
  job: Omit<JobRequest, 'source_connection_id' | 'target_connection_id'>;
  registrationConfig?: JsonObject;
  /** Fields the browser cannot honor the way the CLI does. */
  warnings: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : v === undefined || v === null ? '' : String(v).trim());
const int = (v: unknown, field: string): number => {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v !== 'number' || !Number.isInteger(v)) throw new Error(`${field} must be a whole number`);
  if (v < 0) throw new Error(`${field} must be >= 0`);
  return v;
};

/** Reads a run file (YAML or JSON) into a raw object. */
export function readRunFile(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('The file is empty.');
  const data = trimmed.startsWith('{') ? JSON.parse(trimmed) : parseYaml(text);
  if (!isObject(data)) throw new Error('A run file must be a mapping with source, target and job sections.');
  return data;
}

/** True when the object looks like an orabbit-client run file rather than a one-shot request. */
export function isCliRunFile(data: Record<string, unknown>): boolean {
  return isObject(data.job) || (isObject(data.source) && 'name' in data.source);
}

/** Validates a run file like the CLI and builds what to send to the master. Throws on the first problem. */
export function planCliRun(data: Record<string, unknown>, engines: SourceEngine[]): CliRunPlan {
  const source = isObject(data.source) ? data.source : {};
  const target = isObject(data.target) ? data.target : {};
  const job = isObject(data.job) ? data.job : {};
  const iceberg = isObject(data.iceberg) ? data.iceberg : {};
  const warnings: string[] = [];

  const required = (section: string, obj: Record<string, unknown>, key: string) => {
    if (!str(obj[key])) throw new Error(`${section}.${key} is required`);
    return str(obj[key]);
  };

  const engine = required('source', source, 'engine').toLowerCase();
  const sourceName = required('source', source, 'name');
  const dsn = required('source', source, 'dsn');
  const sql = str(source.sql);
  const targetName = required('target', target, 'name');
  const endpoint = required('target', target, 'endpoint');
  const region = required('target', target, 'region');
  const bucket = required('target', target, 'bucket');
  const accessKeyId = required('target', target, 'access_key_id');
  const secretAccessKey = required('target', target, 'secret_access_key');
  const jobName = required('job', job, 'name');
  const targetNamespace = required('job', job, 'target_namespace');
  const targetTable = required('job', job, 'target_table');
  const table = required('job', job, 'table');
  if (typeof job.incremental !== 'boolean') throw new Error('job.incremental is required (true or false)');
  if (typeof job.auto_tune !== 'boolean') throw new Error('job.auto_tune is required (true or false)');
  const incremental = job.incremental;
  const autoTune = job.auto_tune;

  let cursorColumn = str(job.cursor_column);
  const idColumn = str(job.id_column);
  if (!cursorColumn) cursorColumn = idColumn;
  else if (idColumn && idColumn !== cursorColumn) {
    throw new Error(`job.cursor_column "${cursorColumn}" and the deprecated job.id_column "${idColumn}" differ; set only job.cursor_column`);
  }

  const writeMode = str(job.write_mode).toLowerCase();
  if (writeMode && writeMode !== 'append' && writeMode !== 'overwrite') {
    throw new Error(`job.write_mode must be "append" or "overwrite", got "${writeMode}"`);
  }
  if (incremental && writeMode === 'overwrite') throw new Error('job.write_mode "overwrite" cannot be combined with incremental; use "append"');
  if (!incremental && writeMode === 'append') throw new Error('job.write_mode "append" needs an incremental job; use "overwrite"');

  const maxInFlight = int(job.max_in_flight_tasks, 'job.max_in_flight_tasks');
  const targetRowsPerTask = int(job.target_rows_per_task, 'job.target_rows_per_task');
  const plannedTasks = int(job.planned_tasks, 'job.planned_tasks');
  const chunkSize = int(job.chunk_size, 'job.chunk_size');
  const fetchLimit = int(job.fetch_limit, 'job.fetch_limit');

  const known = engines.find((e) => e.engine === engine);
  if (!known) throw new Error(`source.engine "${engine}" is not supported by this master (known: ${engines.map((e) => e.engine).join(', ')})`);

  const options: JsonObject = { table };
  let partitionStrategy = 'single';
  let jobIncremental = false;
  let hwmColumn: string | null = null;

  if (engine === 'flightsql') {
    if (!sql) throw new Error('source.sql is required for FlightSQL submissions');
    if (incremental) throw new Error('job.incremental=false is required for FlightSQL submissions');
    if (cursorColumn) throw new Error('job.cursor_column is not supported for FlightSQL submissions');
    if (autoTune) throw new Error('job.auto_tune=false is required for FlightSQL submissions');
    if (maxInFlight || targetRowsPerTask || plannedTasks || chunkSize || fetchLimit) {
      throw new Error('FlightSQL submissions do not accept manual planning fields');
    }
    options.auto_tune = false;
    options.max_in_flight_tasks = 1;
  } else if (known.ordered_cursor_supported) {
    if (sql) throw new Error(`source.sql is not supported for ${engine} run files; use job.table and job.cursor_column instead`);
    if (!cursorColumn) throw new Error(`job.cursor_column is required for ${engine} submissions`);
    if (autoTune) {
      if (plannedTasks || chunkSize) throw new Error('planned_tasks and chunk_size must be omitted when job.auto_tune=true');
    } else {
      if (maxInFlight < 1) throw new Error('job.max_in_flight_tasks must be >= 1 when job.auto_tune=false');
      if (plannedTasks < 1 && targetRowsPerTask < 1 && chunkSize < 1) {
        throw new Error('job.planned_tasks or job.target_rows_per_task must be set when job.auto_tune=false');
      }
    }
    partitionStrategy = 'ordered_cursor';
    jobIncremental = incremental;
    hwmColumn = cursorColumn;
    Object.assign(options, {
      auto_tune: autoTune,
      max_in_flight_tasks: maxInFlight,
      target_rows_per_task: targetRowsPerTask,
      cursor_column: cursorColumn,
      planned_tasks: plannedTasks,
      chunk_size: chunkSize,
    });
    if (fetchLimit > 0) options.fetch_size = fetchLimit;
  } else {
    throw new Error(`source.engine "${engine}" is not supported by run files; use the New Run form instead`);
  }
  options.partition_strategy = partitionStrategy;

  let registrationConfig: JsonObject | undefined;
  if (iceberg.enabled === true) {
    const icebergEngine = str(iceberg.engine).toLowerCase() || 'rest-go';
    if (icebergEngine !== 'rest-go' && icebergEngine !== 'ice') throw new Error('iceberg.engine must be rest-go or ice');
    const icebergTable = str(iceberg.table);
    const icebergOptions = isObject(iceberg.options) ? iceberg.options : {};
    if (str(iceberg.defaults_file)) {
      warnings.push('iceberg.defaults_file is a file on your machine; the browser cannot read it, so its defaults are not applied.');
    }
    if (!icebergTable) warnings.push('iceberg.table is not set; the master picks its default table name.');
    if (!str(icebergOptions.uri)) warnings.push('iceberg.options.uri is not set; the CLI would take it from your environment, the browser cannot.');
    options.iceberg = { enabled: true, engine: icebergEngine, table: icebergTable };
    const s3Options = isObject(icebergOptions.s3) ? icebergOptions.s3 : {};
    // Like the CLI, registration falls back to the export target for S3 access.
    registrationConfig = {
      ...icebergOptions,
      enabled: true,
      engine: icebergEngine,
      ...(icebergTable ? { table: icebergTable } : {}),
      s3: {
        endpoint: str(s3Options.endpoint) || endpoint,
        region: str(s3Options.region) || region,
        path_style_access: typeof s3Options.path_style_access === 'boolean' ? s3Options.path_style_access : target.force_path_style === true,
        access_key_id: str(s3Options.access_key_id) || accessKeyId,
        secret_access_key: str(s3Options.secret_access_key) || secretAccessKey,
      },
    };
  }

  if (isObject(data.master) && str(data.master.http)) {
    warnings.push('master.http is ignored: the run goes to the master you are logged in to.');
  }

  return {
    sourceConnection: { name: sourceName, kind: 'source', engine, metadata: {}, secret: { dsn } },
    targetConnection: {
      name: targetName,
      kind: 'target',
      engine: 's3',
      metadata: { endpoint, region, bucket, prefix: str(target.prefix), force_path_style: target.force_path_style === true },
      secret: { access_key_id: accessKeyId, secret_access_key: secretAccessKey },
    },
    job: {
      name: jobName,
      source_sql: sql,
      target_namespace: targetNamespace,
      target_table: targetTable,
      write_mode: writeMode,
      incremental: jobIncremental,
      hwm_column: hwmColumn,
      options_json: options,
    },
    registrationConfig,
    warnings,
  };
}

export type CliRunStep = 'source' | 'target' | 'job' | 'run';

async function upsertConnection(req: ConnectionRequest): Promise<{ id: string; created: boolean }> {
  const existing = (await fetchConnections()).find((c) => c.name === req.name);
  if (existing) {
    await updateConnection(existing.id, req);
    return { id: existing.id, created: false };
  }
  return { id: (await createConnection(req)).id, created: true };
}

/** Executes a plan step by step, reporting progress, and returns the started run. */
export async function executeCliRun(
  plan: CliRunPlan,
  onStep: (step: CliRunStep, detail: string) => void
): Promise<RunWithTasks> {
  const source = await upsertConnection(plan.sourceConnection);
  onStep('source', `${source.created ? 'Created' : 'Updated'} source connection "${plan.sourceConnection.name}"`);
  const target = await upsertConnection(plan.targetConnection);
  onStep('target', `${target.created ? 'Created' : 'Updated'} target connection "${plan.targetConnection.name}"`);

  const job: JobRequest = { ...plan.job, source_connection_id: source.id, target_connection_id: target.id };
  const existingJob = (await fetchJobs()).find((j) => j.name === job.name);
  const jobId = existingJob ? (await updateJob(existingJob.id, job)).id : (await createJob(job)).id;
  onStep('job', `${existingJob ? 'Updated' : 'Created'} job "${job.name}"`);

  const run = await startJobRun(jobId, plan.registrationConfig);
  onStep('run', `Started run ${run.run.id} with ${run.tasks.length} tasks`);
  return run;
}
