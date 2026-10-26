import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { createConnection, deleteConnection, fetchConnections, fetchSourceEngines, updateConnection } from '@/api/connections';
import { errorMessage } from '@/api/client';
import { Connection, ConnectionKind, ConnectionRequest, JsonObject } from '@/api/types';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { PageTitle, Panel, QueryState, TextArea, tableClass, tdClass, thClass } from '@/components/common/QueryState';
import { useToast } from '@/components/common/Toast';
import { formatTime, parseJsonField } from '@/utils/format';

export const Connections: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Connection | 'new' | null>(null);
  const query = useQuery({ queryKey: ['connections'], queryFn: fetchConnections });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => {
      toast.success('Connection deleted.');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (err) => toast.error(errorMessage(err), 'Delete failed'),
  });

  const connections = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Connections"
        subtitle="Saved sources and S3 targets used by jobs. Secrets are encrypted by the master and never shown again."
        actions={<Button variant="cyber" icon={Plus} onClick={() => setEditing('new')}>New connection</Button>}
      />
      <Panel title={`${connections.length} connections`} flush actions={<Button variant="ghost" size="sm" icon={RefreshCw} loading={query.isFetching} onClick={() => query.refetch()}>Refresh</Button>}>
        <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()} isEmpty={!connections.length} emptyMessage="No connections yet.">
          <div>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={`${thClass} w-24`}>Kind</th>
                  <th className={`${thClass} hidden w-32 sm:table-cell`}>Engine</th>
                  <th className={`${thClass} hidden lg:table-cell`}>Metadata</th>
                  <th className={`${thClass} hidden w-44 md:table-cell`}>Updated</th>
                  <th className={`${thClass} w-24`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {connections.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-raised/40">
                    <td className={tdClass}>
                      <div className="text-fg">{c.name}</div>
                      <div className="font-mono text-xs text-fg-subtle">{c.id}</div>
                    </td>
                    <td className={tdClass}>{c.kind}</td>
                    <td className={`${tdClass} hidden sm:table-cell`}>{c.engine}</td>
                    <td className={`${tdClass} hidden truncate font-mono text-xs text-fg-muted lg:table-cell`} title={JSON.stringify(c.metadata_json)}>{c.metadata_json ? JSON.stringify(c.metadata_json) : '—'}</td>
                    <td className={`${tdClass} hidden text-fg-muted md:table-cell`}>{formatTime(c.updated_at)}</td>
                    <td className={`${tdClass} text-right`}>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}>{''}</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        aria-label={`Delete ${c.name}`}
                        onClick={() => {
                          if (window.confirm(`Delete connection "${c.name}"? Jobs using it will stop working.`)) deleteMutation.mutate(c.id);
                        }}
                      >
                        {''}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Panel>
      {editing && <ConnectionFormModal connection={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
};

const ConnectionFormModal: React.FC<{ connection: Connection | null; onClose: () => void }> = ({ connection, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const enginesQuery = useQuery({ queryKey: ['source-engines'], queryFn: fetchSourceEngines, staleTime: 60000 });
  const [form, setForm] = useState({
    name: connection?.name ?? '',
    kind: (connection?.kind ?? 'source') as ConnectionKind,
    engine: connection?.engine ?? '',
    metadata: connection?.metadata_json ? JSON.stringify(connection.metadata_json, null, 2) : '',
    secret: '',
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: () => {
      const req: ConnectionRequest = {
        name: form.name.trim(),
        kind: form.kind,
        engine: form.engine.trim(),
        metadata: parseJsonField<JsonObject>(form.metadata, 'Metadata'),
        secret: parseJsonField<JsonObject>(form.secret, 'Secret'),
      };
      return connection ? updateConnection(connection.id, req) : createConnection(req);
    },
    onSuccess: () => {
      toast.success(`Connection "${form.name}" saved.`);
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      onClose();
    },
  });

  return (
    <Modal isOpen onClose={onClose} title={connection ? `Edit ${connection.name}` : 'New connection'} maxWidth="xl">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Kind" value={form.kind} onChange={(e) => set('kind', e.target.value as ConnectionKind)} options={[{ label: 'source', value: 'source' }, { label: 'target (S3)', value: 'target' }]} />
          <Input label="Engine" list="source-engine-list" value={form.engine} onChange={(e) => set('engine', e.target.value)} placeholder={form.kind === 'target' ? 's3' : 'postgres'} required />
          <datalist id="source-engine-list">
            {(enginesQuery.data ?? []).map((e) => <option key={e.engine} value={e.engine} />)}
          </datalist>
        </div>
        <TextArea
          label="Metadata (JSON)"
          rows={4}
          value={form.metadata}
          onChange={(e) => set('metadata', e.target.value)}
          placeholder={form.kind === 'target' ? '{\n  "endpoint": "http://minio:9000",\n  "bucket": "lake",\n  "prefix": "exports",\n  "region": "us-east-1",\n  "force_path_style": true\n}' : '{}'}
          helperText="Non-secret settings, stored in plain text."
        />
        <TextArea
          label="Secret (JSON)"
          rows={4}
          value={form.secret}
          onChange={(e) => set('secret', e.target.value)}
          placeholder={form.kind === 'target' ? '{\n  "access_key_id": "...",\n  "secret_access_key": "..."\n}' : '{\n  "dsn": "postgres://user:pass@host:5432/db"\n}'}
          helperText={connection ? 'Leave empty to keep the stored secret.' : 'Encrypted at rest with ORABBIT_MASTER_KEY.'}
          autoComplete="off"
        />
        {mutation.error && <p role="alert" className="break-words text-sm text-danger">{errorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>{connection ? 'Save' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
};

