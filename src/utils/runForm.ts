import { ConsistencyMode, IcebergEngine, JsonObject, RunSubmitRequest } from '@/api/types';
import { parseJsonField, splitList } from '@/utils/format';
import { parseYaml } from '@/utils/simpleYaml';

/** '' means "leave it to the master's default", so the field is not sent. */
export type TriState = '' | 'true' | 'false';

export interface RunForm {
  engine: string;
  dsn: string;
  mode: 'table' | 'query';
  table: string;
  query: string;
  cursorColumn: string;
  incremental: boolean;
  whereClause: string;
  selectColumns: string;
  columnTypes: string;
  recordPath: string;
  format: string;

  s3Endpoint: string;
  s3Region: string;
  s3Bucket: string;
  s3Prefix: string;
  s3ForcePathStyle: TriState;
  s3AccessKeyId: string;
  s3SecretAccessKey: string;

  autoTune: TriState;
  maxInFlightTasks: string;
  plannedTasks: string;
  targetRowsPerTask: string;
  targetFileBytes: string;

  icebergEnabled: boolean;
  icebergEngine: IcebergEngine;
  icebergTable: string;
  partitionKeys: string;
  icebergOptions: string;
  icebergConfigYaml: string;

  consistencyMode: '' | ConsistencyMode;
  workerPool: string;
}

export const EMPTY_FORM: RunForm = {
  engine: '',
  dsn: '',
  mode: 'table',
  table: '',
  query: '',
  cursorColumn: '',
  incremental: false,
  whereClause: '',
  selectColumns: '',
  columnTypes: '',
  recordPath: '',
  format: '',
  s3Endpoint: '',
  s3Region: '',
  s3Bucket: '',
  s3Prefix: '',
  s3ForcePathStyle: '',
  s3AccessKeyId: '',
  s3SecretAccessKey: '',
  autoTune: '',
  maxInFlightTasks: '',
  plannedTasks: '',
  targetRowsPerTask: '',
  targetFileBytes: '',
  icebergEnabled: false,
  icebergEngine: 'rest-go',
  icebergTable: '',
  partitionKeys: '',
  icebergOptions: '',
  icebergConfigYaml: '',
  consistencyMode: '',
  workerPool: '',
};

export const TRI_OPTIONS = [
  { label: 'Master default', value: '' },
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
];

function optionalInt(raw: string, field: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${field} must be a whole number ≥ 0`);
  return n;
}

function optionalBool(v: TriState): boolean | undefined {
  return v === '' ? undefined : v === 'true';
}

function optionalString(v: string): string | undefined {
  const t = v.trim();
  return t ? t : undefined;
}

/** Drops undefined values so the request only carries what the user set. */
function compact<T extends object>(obj: T): T | undefined {
  const entries = Object.entries(obj).filter(([, v]) => v !== undefined);
  return entries.length ? (Object.fromEntries(entries) as T) : undefined;
}

/** Turns the form into the master's RunSubmitRequest. Throws on invalid input. */
export function buildRequest(f: RunForm): RunSubmitRequest {
  const columnTypes = parseJsonField<Record<string, string>>(f.columnTypes, 'Column types');
  const icebergOptions = parseJsonField<JsonObject>(f.icebergOptions, 'Iceberg options');
  const selectColumns = splitList(f.selectColumns);
  const partitionKeys = splitList(f.partitionKeys);

  return {
    source: {
      engine: f.engine,
      dsn: f.dsn.trim(),
      mode: f.mode,
      table: f.mode === 'table' ? optionalString(f.table) : undefined,
      query: f.mode === 'query' ? optionalString(f.query) : undefined,
      cursor_column: optionalString(f.cursorColumn),
      incremental: f.incremental || undefined,
      where_clause: optionalString(f.whereClause),
      select_columns: selectColumns.length ? selectColumns : undefined,
      column_types: columnTypes,
      record_path: optionalString(f.recordPath),
      format: optionalString(f.format),
    },
    target: compact({
      s3_endpoint: optionalString(f.s3Endpoint),
      s3_region: optionalString(f.s3Region),
      s3_bucket: optionalString(f.s3Bucket),
      s3_prefix: optionalString(f.s3Prefix),
      s3_force_path_style: optionalBool(f.s3ForcePathStyle),
      s3_access_key_id: optionalString(f.s3AccessKeyId),
      s3_secret_access_key: optionalString(f.s3SecretAccessKey),
    }) ?? {},
    performance: compact({
      auto_tune: optionalBool(f.autoTune),
      max_in_flight_tasks: optionalInt(f.maxInFlightTasks, 'Max in-flight tasks'),
      planned_tasks: optionalInt(f.plannedTasks, 'Planned tasks'),
      target_rows_per_task: optionalInt(f.targetRowsPerTask, 'Target rows per task'),
      target_file_bytes: optionalInt(f.targetFileBytes, 'Target file bytes'),
    }),
    iceberg: f.icebergEnabled
      ? {
          enabled: true,
          engine: f.icebergEngine,
          table: optionalString(f.icebergTable),
          partition_keys: partitionKeys.length ? partitionKeys : undefined,
          options: icebergOptions,
          config_yaml: optionalString(f.icebergConfigYaml),
        }
      : undefined,
    consistency: f.consistencyMode ? { mode: f.consistencyMode } : undefined,
    worker_pool: optionalString(f.workerPool),
  };
}

/** The request without secrets, for files people may share. */
export function withoutSecrets(req: RunSubmitRequest): RunSubmitRequest {
  const { s3_secret_access_key: _secret, ...target } = req.target;
  return { ...req, source: { ...req.source, dsn: '' }, target };
}

/** The request as shown in the preview, with secrets hidden. */
export function redact(req: RunSubmitRequest): RunSubmitRequest {
  return {
    ...req,
    source: { ...req.source, dsn: req.source.dsn ? '••••••' : '' },
    target: {
      ...req.target,
      ...(req.target.s3_secret_access_key ? { s3_secret_access_key: '••••••' } : {}),
    },
  };
}


const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));
const tri = (v: unknown): TriState => (v === true ? 'true' : v === false ? 'false' : '');
const json = (v: unknown): string => (v && typeof v === 'object' && Object.keys(v).length ? JSON.stringify(v, null, 2) : '');
const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Fills the form from a RunSubmitRequest (the master's one-shot format, also what "Save" writes). */
export function requestToForm(req: RunSubmitRequest): RunForm {
  const s = req.source ?? ({} as RunSubmitRequest['source']);
  const t = req.target ?? {};
  const p = req.performance ?? {};
  const i = req.iceberg ?? {};
  return {
    ...EMPTY_FORM,
    engine: str(s.engine),
    dsn: str(s.dsn),
    mode: s.mode === 'query' || (!s.mode && s.query) ? 'query' : 'table',
    table: str(s.table),
    query: str(s.query),
    cursorColumn: str(s.cursor_column),
    incremental: !!s.incremental,
    whereClause: str(s.where_clause),
    selectColumns: (s.select_columns ?? []).join(', '),
    columnTypes: json(s.column_types),
    recordPath: str(s.record_path),
    format: str(s.format),
    s3Endpoint: str(t.s3_endpoint),
    s3Region: str(t.s3_region),
    s3Bucket: str(t.s3_bucket),
    s3Prefix: str(t.s3_prefix),
    s3ForcePathStyle: tri(t.s3_force_path_style),
    s3AccessKeyId: str(t.s3_access_key_id),
    s3SecretAccessKey: str(t.s3_secret_access_key),
    autoTune: tri(p.auto_tune),
    maxInFlightTasks: str(p.max_in_flight_tasks),
    plannedTasks: str(p.planned_tasks),
    targetRowsPerTask: str(p.target_rows_per_task),
    targetFileBytes: str(p.target_file_bytes),
    icebergEnabled: !!i.enabled,
    icebergEngine: i.engine === 'ice' ? 'ice' : 'rest-go',
    icebergTable: str(i.table),
    partitionKeys: (i.partition_keys ?? []).join(', '),
    icebergOptions: json(i.options),
    icebergConfigYaml: str(i.config_yaml),
    consistencyMode: (req.consistency?.mode ?? '') as RunForm['consistencyMode'],
    workerPool: str(req.worker_pool),
  };
}

/**
 * Converts the orabbit-client run file (`orabbit-client run submit --file`,
 * see O_Rabbit/internal/orabbitcli/runsubmit.go) to the one-shot format.
 * Job and connection names, write mode, chunk_size and fetch_limit have no
 * one-shot equivalent; they are returned in `ignored` so the UI can say so.
 */
export function cliFileToRequest(file: Record<string, unknown>): { request: RunSubmitRequest; ignored: string[] } {
  const source = isObject(file.source) ? file.source : {};
  const target = isObject(file.target) ? file.target : {};
  const job = isObject(file.job) ? file.job : {};
  const iceberg = isObject(file.iceberg) ? file.iceberg : {};
  const sql = str(source.sql).trim();
  const num = (v: unknown) => (typeof v === 'number' && v > 0 ? v : undefined);

  const ignored = [
    'source.name', 'target.name', 'job.name', 'job.target_namespace', 'job.target_table',
    'job.write_mode', 'job.chunk_size', 'job.fetch_limit', 'iceberg.defaults_file', 'master.http',
  ].filter((path) => {
    const [section, key] = path.split('.');
    const value = (file[section] as Record<string, unknown> | undefined)?.[key];
    return value !== undefined && value !== '' && value !== null;
  });

  return {
    ignored,
    request: {
      source: {
        engine: str(source.engine),
        dsn: str(source.dsn),
        mode: sql ? 'query' : 'table',
        table: sql ? undefined : str(job.table) || undefined,
        query: sql || undefined,
        cursor_column: str(job.cursor_column || job.id_column) || undefined,
        incremental: job.incremental === true || undefined,
      },
      target: {
        s3_endpoint: str(target.endpoint) || undefined,
        s3_region: str(target.region) || undefined,
        s3_bucket: str(target.bucket) || undefined,
        s3_prefix: str(target.prefix) || undefined,
        s3_force_path_style: typeof target.force_path_style === 'boolean' ? target.force_path_style : undefined,
        s3_access_key_id: str(target.access_key_id) || undefined,
        s3_secret_access_key: str(target.secret_access_key) || undefined,
      },
      performance: {
        auto_tune: typeof job.auto_tune === 'boolean' ? job.auto_tune : undefined,
        max_in_flight_tasks: num(job.max_in_flight_tasks),
        planned_tasks: num(job.planned_tasks),
        target_rows_per_task: num(job.target_rows_per_task),
      },
      iceberg: iceberg.enabled
        ? {
            enabled: true,
            engine: str(iceberg.engine).toLowerCase() === 'ice' ? 'ice' : 'rest-go',
            table: str(iceberg.table) || undefined,
            options: isObject(iceberg.options) ? (iceberg.options as JsonObject) : undefined,
          }
        : undefined,
    },
  };
}

export type RunFileKind = 'one-shot' | 'cli';

/** Reads a run file (YAML or JSON) in either format. Throws a readable Error for anything else. */
export function parseRunFile(text: string): { form: RunForm; kind: RunFileKind; ignored: string[] } {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('The file is empty.');
  let data: unknown;
  if (trimmed.startsWith('{')) {
    try {
      data = JSON.parse(trimmed);
    } catch (err) {
      throw new Error(`Not valid JSON: ${(err as Error).message}`);
    }
  } else {
    data = parseYaml(text);
  }
  if (!isObject(data) || !isObject(data.source)) throw new Error('A run file needs a "source" section.');
  // The CLI file has a "job" section and names its source; the one-shot format has neither.
  if (isObject(data.job) || 'name' in data.source) {
    const { request, ignored } = cliFileToRequest(data);
    return { form: requestToForm(request), kind: 'cli', ignored };
  }
  return { form: requestToForm(data as unknown as RunSubmitRequest), kind: 'one-shot', ignored: [] };
}
