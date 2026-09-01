import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobs, createJob, deleteJob } from '@/api/jobs';
import { fetchConnections } from '@/api/connections';
import { submitJobRun } from '@/api/runs';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { SchemaInspectorModal } from '@/components/common/SchemaInspectorModal';
import { TableRowPreviewModal } from '@/components/common/TableRowPreviewModal';
import { Input, Select } from '@/components/common/Input';
import { useToast } from '@/components/common/Toast';
import { useNavigate, Link } from 'react-router-dom';
import {
  Briefcase,
  Plus,
  PlayCircle,
  Trash2,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  Search,
  Terminal,
  Eye,
  FileText,
} from 'lucide-react';
import { Job } from '@/api/types';

export const Jobs: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewTableName, setPreviewTableName] = useState('orders');

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: fetchConnections,
  });

  const sourceConnections = connections.filter((c) => c.kind === 'source');
  const targetConnections = connections.filter((c) => c.kind === 'target');

  // Form State
  const [sourceConnId, setSourceConnId] = useState('');
  const [targetConnId, setTargetConnId] = useState('');
  const [sourceMode, setSourceMode] = useState<'table' | 'query'>('table');
  const [sourceTable, setSourceTable] = useState('');
  const [sourceSql, setSourceSql] = useState('');
  const [idColumn, setIdColumn] = useState('id');
  const [cursorColumn, setCursorColumn] = useState('id');
  const [targetNamespace, setTargetNamespace] = useState('default');
  const [targetTable, setTargetTable] = useState('');
  const [writeMode, setWriteMode] = useState<'append' | 'overwrite'>('append');
  const [incremental, setIncremental] = useState(true);
  const [autoTune, setAutoTune] = useState(true);
  const [targetRowsPerTask, setTargetRowsPerTask] = useState(100000);
  const [enableIceberg, setEnableIceberg] = useState(true);

  const createMutation = useMutation({
    mutationFn: async () => {
      const srcConn = sourceConnections.find((c) => c.id === sourceConnId) || sourceConnections[0];
      const tgtConn = targetConnections.find((c) => c.id === targetConnId) || targetConnections[0];

      if (!srcConn) throw new Error('Please create a Source Connection first before creating an export job');
      if (!tgtConn) throw new Error('Please create an S3/MinIO Target Storage Connection first');

      const derivedTargetTable = targetTable || (sourceMode === 'table' ? sourceTable : 'custom_export');

      const payload = {
        source_connection_id: srcConn.id,
        target_connection_id: tgtConn.id,
        target_table: derivedTargetTable,
        write_mode: writeMode,
        incremental: sourceMode === 'query' ? false : incremental,
        hwm_column: cursorColumn,
        source_sql: sourceMode === 'query' ? sourceSql : undefined,
        options_json: {
          source_mode: sourceMode,
          table: sourceMode === 'table' ? sourceTable : undefined,
          query: sourceMode === 'query' ? sourceSql : undefined,
          id_column: idColumn,
          cursor_column: cursorColumn,
          auto_tune: autoTune,
          target_rows_per_task: targetRowsPerTask,
          iceberg: {
            enabled: enableIceberg,
            namespace: targetNamespace || 'default',
            table: derivedTargetTable,
          },
        },
      };
      return createJob(payload);
    },
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(`Export Job for ${newJob.target_table || sourceTable} created!`);
      setIsCreateModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create export job');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Export job removed');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete job');
    },
  });

  const runMutation = useMutation({
    mutationFn: (id: string) => submitJobRun(id),
    onSuccess: (run) => {
      toast.success(`Run #${run.id.slice(0, 8)} launched!`, 'Run Submitted');
      navigate(`/runs/${run.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to start run');
    },
  });

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
            <Briefcase className="h-5 w-5 text-emerald-400" />
            Export Jobs Registry
          </h2>
          <p className="text-xs text-emerald-500/80 mt-0.5">
            Configure extraction jobs, partition strategies, high-water mark tracking, and Lakehouse destinations.
          </p>
        </div>
        <Button
          variant="cyber"
          icon={Plus}
          onClick={() => {
            if (sourceConnections.length > 0) setSourceConnId(sourceConnections[0].id);
            if (targetConnections.length > 0) setTargetConnId(targetConnections[0].id);
            setIsCreateModalOpen(true);
          }}
        >
          Create Export Job
        </Button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {jobs.map((job) => {
          const srcConn = connections.find((c) => c.id === job.source_connection_id);
          const tgtConn = connections.find((c) => c.id === job.target_connection_id);
          const table = job.options_json?.table || job.target_table || 'Custom Query';
          const cursor = job.options_json?.cursor_column || job.hwm_column || 'id';

          return (
            <div
              key={job.id}
              className="p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-700/40 text-emerald-400">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-emerald-100 text-sm font-mono truncate max-w-[180px]">
                        {table}
                      </h3>
                      <span className="text-[10px] text-emerald-600 font-mono">
                        JOB-{job.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      job.incremental
                        ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/40'
                        : 'bg-emerald-950 text-emerald-500 border-emerald-800/40'
                    }`}
                  >
                    {job.incremental ? '[INCREMENTAL]' : '[FULL SCAN]'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono bg-[#020504] p-3 rounded-lg border border-surface-border">
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Source:</span>
                    <span className="text-emerald-200 font-semibold truncate max-w-[140px]">
                      {srcConn?.engine?.toUpperCase() || 'DB'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Target S3:</span>
                    <span className="text-emerald-300 truncate max-w-[140px]">
                      {tgtConn?.metadata_json?.bucket || 'S3'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Cursor Column:</span>
                    <span className="text-emerald-400 font-bold">{cursor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Iceberg Table:</span>
                    <span className="text-cyan-400">
                      {job.options_json?.iceberg?.enabled !== false ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                    icon={Trash2}
                    loading={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete Export Job for ${table}?`)) {
                        deleteMutation.mutate(job.id);
                      }
                    }}
                  >
                    Delete
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={FileText}
                    onClick={() => {
                      setPreviewTableName(table);
                      setIsPreviewModalOpen(true);
                    }}
                  >
                    Rows
                  </Button>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={PlayCircle}
                  loading={runMutation.isPending}
                  onClick={() => runMutation.mutate(job.id)}
                >
                  Execute Job
                </Button>
              </div>
            </div>
          );
        })}

        {jobs.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-emerald-700 border border-dashed border-emerald-950 rounded-xl space-y-3 font-mono">
            <p>[No export jobs configured yet]</p>
            <Button
              variant="cyber"
              size="sm"
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Your First Job
            </Button>
          </div>
        )}
      </div>

      {/* Create Job Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Export Job"
        subtitle="Configure table extraction, cursor tracking, and lakehouse destination"
        maxWidth="xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4 font-mono text-xs"
        >
          {/* Source & Target Connections */}
          {sourceConnections.length === 0 ? (
            <div className="p-4 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs space-y-2">
              <p>! No Source Database Connections found.</p>
              <Link to="/connections">
                <Button variant="cyber" size="sm">
                  Create Source Connection First
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Source Connection"
                value={sourceConnId}
                onChange={(e) => setSourceConnId(e.target.value)}
                options={sourceConnections.map((c) => ({
                  label: `${String(c.engine || 'DB').toUpperCase()}: ${c.name || String(c.id || '').slice(0, 8)}`,
                  value: c.id,
                }))}
              />

              <Select
                label="Target S3 Connection"
                value={targetConnId}
                onChange={(e) => setTargetConnId(e.target.value)}
                options={targetConnections.map((c) => ({
                  label: `S3: ${c.metadata_json?.bucket || String(c.id || '').slice(0, 8)}`,
                  value: c.id,
                }))}
              />
            </div>
          )}

          {/* Mode Selector */}
          <div className="border-t border-surface-border pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                Extraction Strategy
              </span>
              <button
                type="button"
                onClick={() => setIsSchemaModalOpen(true)}
                className="text-xs text-emerald-400 hover:text-emerald-200 flex items-center gap-1 font-mono transition"
              >
                <Search className="h-3 w-3" /> [Inspect Source Schema]
              </button>
            </div>

            <div className="flex rounded-lg bg-[#020504] border border-surface-border p-1">
              <button
                type="button"
                onClick={() => setSourceMode('table')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold transition ${
                  sourceMode === 'table'
                    ? 'bg-emerald-950 text-[#00ff66] border border-emerald-500/40'
                    : 'text-emerald-600 hover:text-emerald-400'
                }`}
              >
                Single Table Extraction
              </button>
              <button
                type="button"
                onClick={() => setSourceMode('query')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold transition ${
                  sourceMode === 'query'
                    ? 'bg-emerald-950 text-[#00ff66] border border-emerald-500/40'
                    : 'text-emerald-600 hover:text-emerald-400'
                }`}
              >
                Custom SQL Transformation
              </button>
            </div>
          </div>

          {sourceMode === 'table' ? (
            <div className="space-y-3">
              {/* Quick Table Selectors */}
              <div className="space-y-1.5">
                <span className="text-[10px] text-emerald-600 font-mono uppercase">Quick Select Real Table:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['orders', 'transactions', 'users', 'payments', 'audit_logs', 'events', 'inventory', 'customers'].map((tName) => (
                    <button
                      key={tName}
                      type="button"
                      onClick={() => {
                        setSourceTable(tName);
                        setTargetTable(tName);
                        setCursorColumn(tName === 'transactions' || tName === 'events' ? 'timestamp' : 'id');
                      }}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                        sourceTable === tName
                          ? 'bg-emerald-500/20 text-[#00ff66] border-emerald-500/60 shadow-terminal-sm'
                          : 'bg-[#020504] text-emerald-500 border-surface-border hover:border-emerald-700/60'
                      }`}
                    >
                      {tName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Source Table Name"
                  placeholder="e.g. orders or transactions"
                  value={sourceTable}
                  onChange={(e) => setSourceTable(e.target.value)}
                  required
                />

                <Input
                  label="Cursor Column (HWM)"
                  placeholder="e.g. id, timestamp, updated_at"
                  value={cursorColumn}
                  onChange={(e) => setCursorColumn(e.target.value)}
                  required
                  helperText="Orderable column used for incremental high-water mark tracking."
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-emerald-300">
                Source SQL Query
              </label>
              <textarea
                value={sourceSql}
                onChange={(e) => setSourceSql(e.target.value)}
                rows={4}
                className="w-full bg-[#020504] border border-surface-border rounded-lg p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500/60"
                placeholder="SELECT id, user_id, amount, status FROM transactions WHERE status = 'ACTIVE'"
                required
              />
              <span className="text-[10px] text-emerald-600">
                Custom query results will be streamed directly into columnar Parquet files in S3.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Target Iceberg Namespace"
              placeholder="default"
              value={targetNamespace}
              onChange={(e) => setTargetNamespace(e.target.value)}
            />

            <Input
              label="Target Iceberg Table Name"
              placeholder={sourceTable || 'custom_export'}
              value={targetTable}
              onChange={(e) => setTargetTable(e.target.value)}
            />
          </div>

          <div className="p-3.5 rounded-lg bg-[#020504] border border-surface-border space-y-2.5">
            {sourceMode === 'table' && (
              <label className="flex items-center gap-2 text-xs font-semibold text-emerald-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incremental}
                  onChange={(e) => setIncremental(e.target.checked)}
                  className="rounded bg-terminal-dark border-emerald-900 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Incremental CDC (Store HWM cursor checkpoint in _state.json)</span>
              </label>
            )}

            <label className="flex items-center gap-2 text-xs font-semibold text-emerald-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoTune}
                onChange={(e) => setAutoTune(e.target.checked)}
                className="rounded bg-terminal-dark border-emerald-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Enable Auto-Tune Partition Planning & Sizing</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-semibold text-emerald-300 cursor-pointer">
              <input
                type="checkbox"
                checked={enableIceberg}
                onChange={(e) => setEnableIceberg(e.target.checked)}
                className="rounded bg-terminal-dark border-emerald-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Register Ingested Parquet into Iceberg REST Catalog</span>
            </label>
          </div>

          {createMutation.error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs font-mono">
              ! {createMutation.error.message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="cyber"
              type="submit"
              icon={Plus}
              loading={createMutation.isPending}
            >
              Create Job
            </Button>
          </div>
        </form>
      </Modal>

      <SchemaInspectorModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
        connectionId={sourceConnId}
        onSelectTableAndCursor={(tbl, cur) => {
          setSourceTable(tbl);
          setCursorColumn(cur);
        }}
      />

      <TableRowPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        tableName={previewTableName}
      />
    </div>
  );
};

