import { describe, it, expect } from 'vitest';
import {
  normalizeSqlForDuckDB,
  executeQuery,
  SEED_TRANSACTIONS,
  SEED_ICEBERG_STATES,
} from './duckdb';

describe('utils/duckdb', () => {
  describe('normalizeSqlForDuckDB', () => {
    it('strips ClickHouse iceberg(...) table wrapper into raw table name', () => {
      const input = "SELECT * FROM iceberg('http://catalog:5000', 'default', 'transactions') WHERE id = 1";
      const normalized = normalizeSqlForDuckDB(input);
      expect(normalized).toBe('SELECT * FROM transactions WHERE id = 1');
    });

    it('transforms toStartOfHour into DuckDB date_trunc', () => {
      const input = 'SELECT toStartOfHour(created_at) as hr FROM transactions';
      const normalized = normalizeSqlForDuckDB(input);
      expect(normalized).toBe("SELECT date_trunc('hour', created_at) as hr FROM transactions");
    });

    it('leaves standard ANSI SQL unchanged', () => {
      const input = 'SELECT id, count(*) FROM orders GROUP BY id';
      expect(normalizeSqlForDuckDB(input)).toBe(input);
    });
  });

  describe('executeQuery fallback execution', () => {
    it('executes transactions query and returns formatted tabular structure', async () => {
      const result = await executeQuery('SELECT * FROM transactions LIMIT 5');
      expect(result.columns).toContain('id');
      expect(result.columns).toContain('amount');
      expect(result.rows.length).toBe(SEED_TRANSACTIONS.length);
      expect(result.engine).toBe('in-memory-fallback');
    });

    it('routes iceberg_metadata_states query to appropriate schema', async () => {
      const result = await executeQuery('SELECT * FROM iceberg_metadata_states');
      expect(result.columns).toContain('dataset_key');
      expect(result.columns).toContain('max_hwm_value');
      expect(result.rows.length).toBe(SEED_ICEBERG_STATES.length);
    });
  });
});
