import { apiRequest, apiClient, postJSON, putJSON } from './client';
import { Connection, ConnectionRequest, SourceEngine } from './types';

/** GET /connections, following X-Next-Cursor until every page is loaded. */
export async function fetchConnections(): Promise<Connection[]> {
  const all: Connection[] = [];
  let cursor = '';
  do {
    const params = new URLSearchParams({ limit: '1000' });
    if (cursor) params.set('cursor', cursor);
    const { data, headers } = await apiRequest<Connection[]>(`connections?${params}`);
    all.push(...(data ?? []));
    cursor = headers.get('X-Next-Cursor') || '';
  } while (cursor);
  return all;
}

export function createConnection(req: ConnectionRequest): Promise<Connection> {
  return postJSON<Connection>('connections', req);
}

export function updateConnection(id: string, req: ConnectionRequest): Promise<Connection> {
  return putJSON<Connection>(`connections/${encodeURIComponent(id)}`, req);
}

export function deleteConnection(id: string): Promise<void> {
  return apiClient<void>(`connections/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function fetchSourceEngines(): Promise<SourceEngine[]> {
  return (await apiClient<SourceEngine[]>('source-engines')) ?? [];
}
