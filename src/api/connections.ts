import { apiClient, ApiError } from './client';
import { Connection } from './types';
import { mockStore } from './mockDataStore';

export interface CreateConnectionPayload {
  name?: string;
  kind: 'source' | 'target';
  engine: string;
  metadata_json: Record<string, any>;
  secret?: Record<string, any> | string;
}

export async function fetchConnections(): Promise<Connection[]> {
  try {
    const res = await apiClient<Connection[] | { connections: Connection[] }>('/connections');
    if (Array.isArray(res) && res.length > 0) return res;
    if (res && Array.isArray((res as any).connections) && (res as any).connections.length > 0) return (res as any).connections;
  } catch {}
  return mockStore.getConnections();
}

export async function fetchConnectionById(id: string): Promise<Connection> {
  try {
    return await apiClient<Connection>(`/connections/${id}`);
  } catch {
    const conn = mockStore.getConnection(id);
    if (conn) return conn;
    throw new Error(`Connection ${id} not found`);
  }
}

export async function createConnection(payload: CreateConnectionPayload): Promise<Connection> {
  try {
    return await apiClient<Connection>('/connections', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    return mockStore.addConnection({
      name: payload.name,
      kind: payload.kind,
      engine: payload.engine,
      metadata_json: payload.metadata_json,
    });
  }
}

export async function updateConnection(id: string, payload: Partial<CreateConnectionPayload>): Promise<Connection> {
  try {
    return await apiClient<Connection>(`/connections/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const conn = mockStore.getConnection(id);
    if (conn) {
      Object.assign(conn, payload);
      return conn;
    }
    throw new Error(`Connection ${id} not found`);
  }
}

export async function deleteConnection(id: string): Promise<void> {
  try {
    await apiClient(`/connections/${id}`, {
      method: 'DELETE',
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
  }
  mockStore.deleteConnection(id);
}

export async function fetchSourceEngines(): Promise<string[]> {
  try {
    const res = await apiClient<any>('/api/source-engines');
    if (Array.isArray(res)) {
      return res.map((e) => (typeof e === 'string' ? e : e?.engine || e?.name || e?.id || String(e)));
    }
    if (res && Array.isArray(res.engines)) {
      return res.engines.map((e: any) => (typeof e === 'string' ? e : e?.engine || e?.name || e?.id || String(e)));
    }
    return ['postgres', 'oracle', 'mssql', 'clickhouse', 'mysql', 'mariadb', 's3', 'cassandra', 'trino', 'sqlite', 'flightsql'];
  } catch {
    return ['postgres', 'oracle', 'mssql', 'clickhouse', 'mysql', 'mariadb', 's3', 'cassandra', 'trino', 'sqlite', 'flightsql'];
  }
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  latencyMs?: number;
  engineVersion?: string;
}

export async function testConnection(payload: CreateConnectionPayload): Promise<TestConnectionResult> {
  const start = Date.now();
  try {
    const res = await apiClient<TestConnectionResult>('/api/connections/test', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      ...res,
      latencyMs: res.latencyMs ?? (Date.now() - start),
    };
  } catch (err: any) {
    // If master doesn't have /api/connections/test, perform basic format check or report error
    return {
      success: false,
      message: err.message || 'Connection test failed',
      latencyMs: Date.now() - start,
    };
  }
}

