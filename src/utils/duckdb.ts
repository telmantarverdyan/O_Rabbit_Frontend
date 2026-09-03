import * as duckdb from '@duckdb/duckdb-wasm';

export interface QueryExecutionResult {
  columns: string[];
  rows: any[][];
  executionTimeMs: number;
  totalRows: number;
  engine: 'duckdb-wasm' | 'in-memory-fallback';
}

let dbInstance: duckdb.AsyncDuckDB | null = null;
let connInstance: duckdb.AsyncDuckDBConnection | null = null;
let initPromise: Promise<{ db: duckdb.AsyncDuckDB; conn: duckdb.AsyncDuckDBConnection } | null> | null = null;

// Built-in seed data for client-side lakehouse exploration
export const SEED_TRANSACTIONS = [
  { id: '100241', created_at: '2026-08-31T23:59:12Z', user_name: 'telman_t', amount: 1420.5, status: 'COMPLETED', payment_method: 'CRYPTO' },
  { id: '100242', created_at: '2026-09-01T00:01:45Z', user_name: 'alice_k', amount: 89.0, status: 'COMPLETED', payment_method: 'CARD' },
  { id: '100243', created_at: '2026-09-01T00:04:18Z', user_name: 'bob_m', amount: 512.25, status: 'COMPLETED', payment_method: 'WIRE' },
  { id: '100244', created_at: '2026-09-01T00:10:02Z', user_name: 'charlie_z', amount: 12.0, status: 'PENDING', payment_method: 'CARD' },
  { id: '100245', created_at: '2026-09-01T00:15:33Z', user_name: 'diana_v', amount: 3400.0, status: 'COMPLETED', payment_method: 'WIRE' },
  { id: '100246', created_at: '2026-09-01T00:18:50Z', user_name: 'edward_p', amount: 230.1, status: 'COMPLETED', payment_method: 'CRYPTO' },
  { id: '100247', created_at: '2026-09-01T00:22:15Z', user_name: 'frank_b', amount: 780.0, status: 'FAILED', payment_method: 'CARD' },
  { id: '100248', created_at: '2026-09-01T00:25:40Z', user_name: 'grace_l', amount: 1940.75, status: 'COMPLETED', payment_method: 'WIRE' },
];

export const SEED_ICEBERG_STATES = [
  { dataset_key: 'raw/transactions', max_hwm_value: '2026-09-01T00:25:40Z', max_part: 4, committed_at: '2026-09-01T00:26:00Z', format_version: 2 },
  { dataset_key: 'raw/user_profiles', max_hwm_value: '2026-08-31T18:00:00Z', max_part: 1, committed_at: '2026-08-31T18:05:00Z', format_version: 2 },
  { dataset_key: 'raw/audit_logs', max_hwm_value: '2026-09-01T00:30:00Z', max_part: 12, committed_at: '2026-09-01T00:30:15Z', format_version: 2 },
];

export const SEED_PARTITIONS = [
  { partition_date: '2026-08-31', total_rows: 145000, compressed_bytes: 18450000, avg_record_size: 127 },
  { partition_date: '2026-09-01', total_rows: 210000, compressed_bytes: 26800000, avg_record_size: 128 },
  { partition_date: '2026-09-02', total_rows: 198000, compressed_bytes: 25200000, avg_record_size: 127 },
];

/**
 * Normalizes queries from external engines (like ClickHouse iceberg(...) table functions)
 * to standard SQL table names for DuckDB.
 */
export function normalizeSqlForDuckDB(sql: string): string {
  let normalized = sql;
  // Replace iceberg('...', '...', 'transactions') with transactions
  normalized = normalized.replace(/iceberg\([^)]*,\s*['"]?([a-zA-Z0-9_]+)['"]?\)/gi, '$1');
  // Replace toStartOfHour(...) with date_trunc('hour', ...)
  normalized = normalized.replace(/toStartOfHour\(([^)]+)\)/gi, "date_trunc('hour', $1)");
  return normalized;
}

/**
 * Initializes DuckDB-Wasm engine with seed tables.
 */
export async function getDuckDB() {
  if (dbInstance && connInstance) {
    return { db: dbInstance, conn: connInstance };
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    // Check if running in browser environment with Worker support
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }

    try {
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);

      const worker = new Worker(bundle.mainWorker!);
      const logger = new duckdb.VoidLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);

      await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
      const conn = await db.connect();

      // Register seed JSON files and create tables
      await db.registerFileText('transactions.json', JSON.stringify(SEED_TRANSACTIONS));
      await conn.query(`CREATE TABLE IF NOT EXISTS transactions AS SELECT * FROM read_json_auto('transactions.json');`);

      await db.registerFileText('iceberg_metadata_states.json', JSON.stringify(SEED_ICEBERG_STATES));
      await conn.query(`CREATE TABLE IF NOT EXISTS iceberg_metadata_states AS SELECT * FROM read_json_auto('iceberg_metadata_states.json');`);

      await db.registerFileText('partition_metrics.json', JSON.stringify(SEED_PARTITIONS));
      await conn.query(`CREATE TABLE IF NOT EXISTS partition_metrics AS SELECT * FROM read_json_auto('partition_metrics.json');`);

      dbInstance = db;
      connInstance = conn;
      return { db, conn };
    } catch (err) {
      console.warn('DuckDB-Wasm initialization failed, using fallback engine:', err);
      return null;
    }
  })();

  return initPromise;
}

/**
 * Executes SQL query against DuckDB-Wasm, falling back gracefully to memory engine.
 */
export async function executeQuery(rawSql: string): Promise<QueryExecutionResult> {
  const start = performance.now();
  const normalizedSql = normalizeSqlForDuckDB(rawSql);

  const duck = await getDuckDB();

  if (duck && duck.conn) {
    try {
      const arrowTable = await duck.conn.query(normalizedSql);
      const columns = arrowTable.schema.fields.map((f: any) => f.name);
      const rows: any[][] = [];

      for (let i = 0; i < arrowTable.numRows; i++) {
        const row: any[] = [];
        for (const colName of columns) {
          const val = arrowTable.getChild(colName)?.get(i);
          row.push(typeof val === 'bigint' ? Number(val) : val);
        }
        rows.push(row);
      }

      const duration = Math.round(performance.now() - start);
      return {
        columns,
        rows,
        executionTimeMs: duration,
        totalRows: rows.length,
        engine: 'duckdb-wasm',
      };
    } catch (err: any) {
      // If SQL syntax error inside DuckDB, throw so user sees DuckDB error message
      throw new Error(`DuckDB execution error: ${err.message || String(err)}`);
    }
  }

  // Graceful in-memory fallback for environments without WebAssembly/Worker
  return executeInMemoryFallback(normalizedSql, Math.round(performance.now() - start));
}

function executeInMemoryFallback(sql: string, baseDuration: number): QueryExecutionResult {
  const lower = sql.toLowerCase();
  let targetData: Record<string, any>[] = SEED_TRANSACTIONS;

  if (lower.includes('iceberg_metadata_states')) {
    targetData = SEED_ICEBERG_STATES;
  } else if (lower.includes('partition_metrics')) {
    targetData = SEED_PARTITIONS;
  }

  // Simple column projection or select *
  const columns = targetData.length > 0 ? Object.keys(targetData[0]) : [];
  const rows = targetData.map((item) => columns.map((col) => item[col]));

  return {
    columns,
    rows,
    executionTimeMs: Math.max(baseDuration, 18),
    totalRows: rows.length,
    engine: 'in-memory-fallback',
  };
}
