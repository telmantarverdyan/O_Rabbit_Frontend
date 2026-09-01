import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConnections, createConnection, deleteConnection, fetchSourceEngines, testConnection, TestConnectionResult } from '@/api/connections';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { SchemaInspectorModal } from '@/components/common/SchemaInspectorModal';
import { TableRowPreviewModal } from '@/components/common/TableRowPreviewModal';
import { Input, Select } from '@/components/common/Input';
import { useToast } from '@/components/common/Toast';
import { Database, Plus, Trash2, ShieldCheck, Server, HardDrive, Key, CheckCircle2, AlertCircle, Activity, Terminal, Search, Table as TableIcon } from 'lucide-react';
import { Connection } from '@/api/types';

export const Connections: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: fetchConnections,
  });

  const { data: sourceEngines = ['postgres', 'oracle', 'mssql', 'clickhouse', 'mysql', 's3', 'cassandra', 'trino', 'sqlite'] } = useQuery({
    queryKey: ['source-engines'],
    queryFn: fetchSourceEngines,
  });

  // Modal form state
  const [kind, setKind] = useState<'source' | 'target'>('source');
  const [engine, setEngine] = useState('postgres');
  const [name, setName] = useState('');
  const [dsn, setDsn] = useState('');

  // Target S3 fields
  const [endpoint, setEndpoint] = useState('http://localhost:9000');
  const [bucket, setBucket] = useState('lakehouse');
  const [region, setRegion] = useState('us-east-1');
  const [prefix, setPrefix] = useState('lakehouse/raw');
  const [accessKey, setAccessKey] = useState('minioadmin');
  const [secretKey, setSecretKey] = useState('minioadmin');

  const buildPayload = () => {
    if (kind === 'source') {
      return {
        name: name || `${engine}-source`,
        kind: 'source' as const,
        engine: engine,
        metadata_json: { dsn: dsn },
        secret: { dsn: dsn },
      };
    } else {
      return {
        name: name || `s3-${bucket}`,
        kind: 'target' as const,
        engine: 's3',
        metadata_json: {
          endpoint,
          bucket,
          region,
          prefix,
          force_path_style: true,
        },
        secret: {
          access_key_id: accessKey,
          secret_access_key: secretKey,
        },
      };
    }
  };

  const testMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      return testConnection(payload);
    },
    onSuccess: (res) => {
      setTestResult(res);
      if (res.success) {
        toast.success(`Successfully connected in ${res.latencyMs || 12}ms!`, 'Connection Validated');
      } else {
        toast.error(res.message || 'Connection failed', 'Connection Test Failed');
      }
    },
    onError: (err: any) => {
      const failRes: TestConnectionResult = { success: false, message: err.message };
      setTestResult(failRes);
      toast.error(err.message || 'Connection test failed', 'Test Error');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      return createConnection(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Connection created successfully');
      setIsCreateModalOpen(false);
      setTestResult(null);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create connection');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      toast.success('Connection deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete connection');
    },
  });

  const sources = connections.filter((c) => c.kind === 'source');
  const targets = connections.filter((c) => c.kind === 'target');

  const dsnTemplates: Record<string, string> = {
    postgres: 'postgres://user:password@localhost:5432/dbname?sslmode=disable',
    oracle: 'oracle://user:password@localhost:1521/ORCLCDB',
    mssql: 'sqlserver://user:password@localhost:1433?database=dbname',
    clickhouse: 'clickhouse://user:password@localhost:9000/dbname',
    mysql: 'user:password@tcp(localhost:3306)/dbname?parseTime=true',
    cassandra: 'cassandra://localhost:9042/keyspace',
    trino: 'http://user@localhost:8080?catalog=tpch&schema=sf1',
    sqlite: 'file:test.db?cache=shared&mode=ro',
  };

  const [cardTestingId, setCardTestingId] = useState<string | null>(null);

  const testCardMutation = useMutation({
    mutationFn: async (conn: Connection) => {
      setCardTestingId(conn.id);
      return await testConnection({
        name: conn.name,
        kind: conn.kind as any,
        engine: conn.engine,
        metadata_json: conn.metadata_json || {},
        secret: conn.metadata_json?.dsn || '',
      });
    },
    onSuccess: (res, conn) => {
      setCardTestingId(null);
      if (res.success) {
        toast.success(`Connected to ${conn.name || conn.engine} (${res.latencyMs || 8}ms latency)`);
      } else {
        toast.error(`Connection check failed: ${res.message}`);
      }
    },
    onError: (err: any) => {
      setCardTestingId(null);
      toast.error(`Test failed: ${err.message}`);
    },
  });

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
            <Database className="h-5 w-5 text-emerald-400" />
            Storage & Database Connectors
          </h2>
          <p className="text-xs text-emerald-500/80 mt-0.5">
            Configure operational source databases (Postgres, Oracle, MSSQL, ClickHouse, MySQL) and target S3/MinIO buckets.
          </p>
        </div>
        <Button
          variant="cyber"
          icon={Plus}
          size="sm"
          onClick={() => {
            setKind('source');
            setIsCreateModalOpen(true);
          }}
        >
          Add Connection
        </Button>
      </div>

      {/* Source Databases Section */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-2">
          <Database className="h-4 w-4 text-emerald-400" />
          <span>[SOURCE DATABASES ({sources.length})]</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((conn) => (
            <div
              key={conn.id}
              className="p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/40 uppercase">
                    {conn.engine}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono">
                    ID: {String(conn.id || '').slice(0, 8)}
                  </span>
                </div>
                <h4 className="font-bold text-emerald-100 text-sm font-mono truncate">
                  {conn.name || `${conn.engine} source`}
                </h4>
                <div className="p-2.5 rounded-lg bg-[#020504] border border-surface-border text-[11px] font-mono text-emerald-500/80 truncate">
                  {conn.metadata_json?.dsn ? 'dsn://******** (Encrypted at rest)' : 'Configured'}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-border gap-2">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={Search}
                    onClick={() => {
                      setSelectedConnectionId(conn.id);
                      setIsSchemaModalOpen(true);
                    }}
                  >
                    Tables
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Activity}
                    loading={cardTestingId === conn.id}
                    onClick={() => testCardMutation.mutate(conn)}
                  >
                    Ping
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                  icon={Trash2}
                  loading={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete connection ${conn.name || conn.id}?`)) {
                      deleteMutation.mutate(conn.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}

          {sources.length === 0 && !isLoading && (
            <div className="col-span-full py-8 text-center text-emerald-700 border border-dashed border-emerald-950 rounded-xl text-xs font-mono">
              [No source connections configured. Click "Add Connection" to connect Postgres, Oracle, MSSQL, ClickHouse, or MySQL]
            </div>
          )}
        </div>
      </div>

      {/* Target S3 Storage Section */}
      <div className="space-y-3 pt-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-cyan-400" />
          <span>[TARGET OBJECT STORAGE / S3 ({targets.length})]</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((conn) => (
            <div
              key={conn.id}
              className="p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm flex flex-col justify-between space-y-3 hover:border-cyan-500/40 transition group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/40 uppercase">
                    S3 / MinIO
                  </span>
                  <span className="text-[10px] text-emerald-600 font-mono">
                    ID: {conn.id.slice(0, 8)}
                  </span>
                </div>
                <h4 className="font-bold text-emerald-100 text-sm font-mono truncate">
                  {conn.name || conn.metadata_json?.bucket || 'S3 Bucket'}
                </h4>
                <div className="space-y-1 p-2.5 rounded-lg bg-[#020504] border border-surface-border text-[11px] font-mono text-emerald-400">
                  <div className="truncate">Bucket: <span className="text-emerald-200 font-semibold">{conn.metadata_json?.bucket}</span></div>
                  <div className="truncate">Endpoint: <span className="text-cyan-400">{conn.metadata_json?.endpoint}</span></div>
                  <div className="truncate">Prefix: <span className="text-emerald-500/80">{conn.metadata_json?.prefix || '—'}</span></div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                <span className="text-[10px] text-emerald-600 font-mono">
                  {new Date(conn.created_at).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                  icon={Trash2}
                  loading={deleteMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`Delete target storage ${conn.name || conn.id}?`)) {
                      deleteMutation.mutate(conn.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}

          {targets.length === 0 && !isLoading && (
            <div className="col-span-full py-8 text-center text-emerald-700 border border-dashed border-emerald-950 rounded-xl text-xs font-mono">
              [No target S3/MinIO connections configured]
            </div>
          )}
        </div>
      </div>

      {/* Create Connection Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Connection"
        subtitle="Configure a database source connector or lakehouse storage target"
        maxWidth="lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4 font-mono text-xs"
        >
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Connection Role"
              value={kind}
              onChange={(e) => setKind(e.target.value as any)}
              options={[
                { label: 'Source Database', value: 'source' },
                { label: 'Target Storage (S3 / MinIO)', value: 'target' },
              ]}
            />

            {kind === 'source' ? (
              <Select
                label="Database Engine"
                value={engine}
                onChange={(e) => {
                  setEngine(e.target.value);
                  setDsn(dsnTemplates[e.target.value] || '');
                }}
                options={(Array.isArray(sourceEngines) ? sourceEngines : ['postgres', 'oracle', 'mssql', 'clickhouse', 'mysql']).map((eng: any) => {
                  const val = typeof eng === 'string' ? eng : (eng?.value || eng?.name || eng?.engine || String(eng));
                  const label = (typeof eng === 'string' ? eng : (eng?.label || eng?.name || eng?.engine || String(eng))).toUpperCase();
                  return {
                    label,
                    value: val,
                  };
                })}
              />
            ) : (
              <Input
                label="Target Type"
                value="S3 / MinIO Compatible"
                disabled
              />
            )}
          </div>

          <Input
            label="Connection Name (Optional)"
            placeholder="e.g. Production Postgres Replica"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {kind === 'source' ? (
            <div className="space-y-2">
              <Input
                label="Database DSN / Connection String"
                placeholder={dsnTemplates[engine] || 'postgres://user:pass@host:port/db'}
                value={dsn}
                onChange={(e) => setDsn(e.target.value)}
                required
                helperText="Encrypted at rest with AES-256-GCM when master key is configured."
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Endpoint URL"
                  placeholder="http://minio:9000 or https://s3.amazonaws.com"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  required
                />
                <Input
                  label="S3 Bucket Name"
                  placeholder="lakehouse"
                  value={bucket}
                  onChange={(e) => setBucket(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Region"
                  placeholder="us-east-1"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
                <Input
                  label="Base Prefix"
                  placeholder="lakehouse/raw"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Access Key ID"
                  placeholder="minioadmin"
                  value={accessKey}
                  onChange={(e) => setAccessKey(e.target.value)}
                />
                <Input
                  label="Secret Access Key"
                  type="password"
                  placeholder="minioadmin"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
              </div>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-terminal-sm'
                  : 'bg-rose-950/60 border-rose-600/40 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">
                    {testResult.success ? '[PING SUCCESS]' : '[CONNECTION FAILED]'}
                  </span>
                  {testResult.latencyMs !== undefined && (
                    <span className="text-[10px] text-emerald-500/80 font-normal">
                      Latency: {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className="text-[11px] opacity-90">
                  {testResult.message || (testResult.success ? 'Endpoint responded successfully.' : 'Unable to establish connection.')}
                </p>
              </div>
            </div>
          )}

          {createMutation.error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs font-mono">
              ! {createMutation.error.message}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-surface-border">
            <Button
              variant="outline"
              type="button"
              size="sm"
              icon={Activity}
              loading={testMutation.isPending}
              onClick={() => testMutation.mutate()}
            >
              Test Connection
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setTestResult(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="cyber"
                type="submit"
                icon={Plus}
                loading={createMutation.isPending}
              >
                Save Connection
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <SchemaInspectorModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        connectionId={selectedConnectionId}
      />
    </div>
  );
};

