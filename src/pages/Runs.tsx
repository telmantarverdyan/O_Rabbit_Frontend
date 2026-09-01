import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRuns, submitJobRun, submitDirectRun, cancelRun } from '@/api/runs';
import { fetchJobs } from '@/api/jobs';
import { fetchConnections } from '@/api/connections';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input, Select } from '@/components/common/Input';
import { useToast } from '@/components/common/Toast';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  Search,
  Filter,
  Plus,
  ArrowRight,
  StopCircle,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Layers,
  Database,
} from 'lucide-react';
import { Run, RunStatus } from '@/api/types';
import { getTableDetails } from '@/utils/tableCatalog';

export const Runs: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ['runs'],
    queryFn: fetchRuns,
    refetchInterval: 4000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: fetchConnections,
  });

  const toast = useToast();
  const navigate = useNavigate();

  // Run submission form state
  const [submissionMode, setSubmissionMode] = useState<'job' | 'adhoc'>('job');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [autoTune, setAutoTune] = useState(true);
  const [plannedTasks, setPlannedTasks] = useState(1);
  const [fetchLimitRows, setFetchLimitRows] = useState(50000);

  // Ad-hoc run state
  const [sourceConnId, setSourceConnId] = useState('');
  const [targetConnId, setTargetConnId] = useState('');
  const [adhocMode, setAdhocMode] = useState<'table' | 'query'>('table');
  const [sourceTable, setSourceTable] = useState('');
  const [sourceSql, setSourceSql] = useState('');
  const [cursorColumn, setCursorColumn] = useState('id');

  const sourceConnections = connections.filter((c) => c.kind === 'source');
  const targetConnections = connections.filter((c) => c.kind === 'target');

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (submissionMode === 'job') {
        if (!selectedJobId) throw new Error('Please select an Export Job to execute');
        return submitJobRun(selectedJobId, {
          auto_tune: autoTune,
          planned_tasks: autoTune ? undefined : Number(plannedTasks),
          fetch_limit_rows: autoTune ? undefined : Number(fetchLimitRows),
        });
      } else {
        const src = sourceConnections.find((c) => c.id === sourceConnId) || sourceConnections[0];
        const tgt = targetConnections.find((c) => c.id === targetConnId) || targetConnections[0];

        if (!src) throw new Error('Please select a Source Database Connection');

        return submitDirectRun({
          source_engine: src.engine,
          source_dsn: src.metadata_json?.dsn,
          source_mode: adhocMode,
          source_table: adhocMode === 'table' ? sourceTable : undefined,
          source_sql: adhocMode === 'query' ? sourceSql : undefined,
          cursor_column: cursorColumn,
          incremental: true,
          target_s3: tgt ? {
            endpoint: tgt.metadata_json?.endpoint,
            bucket: tgt.metadata_json?.bucket,
            region: tgt.metadata_json?.region,
            prefix: tgt.metadata_json?.prefix,
            access_key_id: tgt.secret?.access_key_id,
            secret_access_key: tgt.secret?.secret_access_key,
            force_path_style: true,
          } : undefined,
          options: {
            auto_tune: autoTune,
            planned_tasks: autoTune ? undefined : Number(plannedTasks),
            fetch_limit_rows: autoTune ? undefined : Number(fetchLimitRows),
          },
        });
      }
    },
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toast.success(`Ingestion Run #${run.id.slice(0, 8)} launched!`, 'Run Submitted');
      setIsSubmitModalOpen(false);
      navigate(`/runs/${run.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to submit ingestion run');
    },
  });

  const filteredRuns = runs.filter((run) => {
    const matchesSearch =
      run.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (run.dataset_key && run.dataset_key.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (run.job_id && run.job_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || run.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-mono">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
            <PlayCircle className="h-5 w-5 text-emerald-400" />
            Ingestion Runs Console
          </h2>
          <p className="text-xs text-emerald-500/70 mt-0.5">
            Monitor live batch runs, partition scheduling, and committed Parquet objects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            icon={RefreshCw}
            size="sm"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => {
              if (jobs.length > 0) setSelectedJobId(jobs[0].id);
              setIsSubmitModalOpen(true);
            }}
          >
            Submit Ingestion Run
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-surface/90 p-3.5 rounded-xl border border-surface-border shadow-terminal-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-emerald-600" />
          <input
            type="text"
            placeholder="grep by Run ID, dataset key, or job ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-terminal-dark border border-surface-border rounded-lg text-xs font-mono text-emerald-100 placeholder-emerald-800 focus:outline-none focus:border-emerald-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-emerald-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-terminal-dark border border-surface-border rounded-lg px-3 py-1.5 text-xs font-mono text-emerald-200 focus:outline-none focus:border-emerald-400"
          >
            <option value="ALL">ALL STATUSES</option>
            <option value="RUNNING">RUNNING</option>
            <option value="COMMITTING">COMMITTING</option>
            <option value="PLANNING">PLANNING</option>
            <option value="SUCCEEDED">SUCCEEDED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>
      </div>

      {/* Runs Table */}
      <div className="rounded-xl border border-surface-border bg-surface/90 overflow-hidden shadow-terminal-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-surface-border bg-surface-darker text-emerald-600 text-[10px] uppercase">
                <th className="py-3 px-4 font-semibold">Run ID</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Dataset Key</th>
                <th className="py-3 px-4 font-semibold">Created At</th>
                <th className="py-3 px-4 font-semibold">Extracted Rows</th>
                <th className="py-3 px-4 font-semibold">Parquet Size</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/40 text-emerald-200">
              {filteredRuns.map((run) => {
                const rows = run.rows_total ?? 0;
                const bytes = run.bytes_total ?? 0;
                const sizeStr = bytes > 0
                  ? (bytes >= 1024 * 1024
                      ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
                      : `${(bytes / 1024).toFixed(1)} KB`)
                  : '0 B';
                const createdDate = run.created_at ? new Date(run.created_at) : new Date();
                const createdTimeStr = !isNaN(createdDate.getTime()) ? createdDate.toLocaleTimeString() : 'Just now';

                return (
                  <tr key={run.id} className="hover:bg-emerald-950/20 transition">
                    <td className="py-3 px-4 font-semibold text-emerald-300">
                      <Link
                        to={`/runs/${run.id}`}
                        className="text-emerald-400 hover:text-emerald-200 hover:underline flex items-center gap-1.5"
                      >
                        <PlayCircle className="h-3.5 w-3.5 text-emerald-500" />
                        RUN-{String(run.id || '').slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={run.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-emerald-400/80 truncate max-w-[200px]" title={run.dataset_key}>
                      {run.dataset_key || '—'}
                    </td>
                    <td className="py-3 px-4 text-emerald-600 text-[11px]">
                      {createdTimeStr}
                    </td>
                    <td className="py-3 px-4 text-emerald-200 font-semibold">
                      {rows.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-cyan-400">{sizeStr}</td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/runs/${run.id}`}
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-200 hover:underline font-mono text-xs font-semibold"
                      >
                        [DRILLDOWN] <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {filteredRuns.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-emerald-700 font-mono">
                    [No runs found matching search/filter criteria]
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-emerald-600 font-mono">
                    Loading runs from master control plane...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Run Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Launch Ingestion Run"
        subtitle="Trigger a batch run from a saved export job or run an ad-hoc direct extraction"
        maxWidth="xl"
      >
        <div className="flex border-b border-surface-border mb-4 text-xs font-mono">
          <button
            type="button"
            onClick={() => setSubmissionMode('job')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition ${
              submissionMode === 'job'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-emerald-600 hover:text-emerald-400'
            }`}
          >
            [Saved Export Job]
          </button>
          <button
            type="button"
            onClick={() => {
              setSubmissionMode('adhoc');
              if (sourceConnections.length > 0 && !sourceConnId) setSourceConnId(sourceConnections[0].id);
              if (targetConnections.length > 0 && !targetConnId) setTargetConnId(targetConnections[0].id);
            }}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition ${
              submissionMode === 'adhoc'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-emerald-600 hover:text-emerald-400'
            }`}
          >
            [Ad-Hoc SQL Extraction]
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitMutation.mutate();
          }}
          className="space-y-4 font-mono text-xs"
        >
          {submissionMode === 'job' ? (
            jobs.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
                No jobs configured yet. Switch to "Ad-Hoc SQL Extraction" or create an Export Job in the Jobs tab.
              </div>
            ) : (
              <Select
                label="Select Export Job"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                options={jobs.map((j) => ({
                  label: `${String(j.id || '').slice(0, 8)}: ${j.target_table || 'Job'} (${j.incremental ? 'Incremental' : 'Full'})`,
                  value: j.id,
                }))}
              />
            )
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                  label="Target S3 Storage"
                  value={targetConnId}
                  onChange={(e) => setTargetConnId(e.target.value)}
                  options={targetConnections.map((c) => ({
                    label: `S3: ${c.metadata_json?.bucket || String(c.id || '').slice(0, 8)}`,
                    value: c.id,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Source Mode"
                  value={adhocMode}
                  onChange={(e) => setAdhocMode(e.target.value as any)}
                  options={[
                    { label: 'Table Scan', value: 'table' },
                    { label: 'Custom SQL Query', value: 'query' },
                  ]}
                />
                <Input
                  label="Cursor Column (HWM)"
                  placeholder="id"
                  value={cursorColumn}
                  onChange={(e) => setCursorColumn(e.target.value)}
                  required
                />
              </div>

              {adhocMode === 'table' ? (
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

                  <Input
                    label="Source Table Name"
                    placeholder="e.g. orders or transactions"
                    value={sourceTable}
                    onChange={(e) => setSourceTable(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
                    Extraction SQL Query
                  </label>
                  <textarea
                    rows={3}
                    placeholder="SELECT * FROM users WHERE active = true"
                    value={sourceSql}
                    onChange={(e) => setSourceSql(e.target.value)}
                    className="w-full rounded-lg border border-surface-border bg-[#020504] px-3.5 py-2 text-xs font-mono text-emerald-300 placeholder-emerald-800 shadow-inner focus:border-emerald-400 focus:outline-none"
                    required
                  />
                </div>
              )}
            </div>
          )}

          <div className="p-3.5 rounded-lg bg-[#020504] border border-surface-border space-y-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-emerald-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoTune}
                onChange={(e) => setAutoTune(e.target.checked)}
                className="rounded bg-terminal-dark border-emerald-900 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Enable Auto-Tune Planner (Recommended)</span>
            </label>
            <p className="text-[10px] text-emerald-600">
              Calculates optimal partition splits and fetch batch limits based on source table metadata.
            </p>

            {!autoTune && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Input
                  label="Planned Tasks"
                  type="number"
                  value={plannedTasks}
                  onChange={(e) => setPlannedTasks(Number(e.target.value))}
                />
                <Input
                  label="Fetch Limit Rows"
                  type="number"
                  value={fetchLimitRows}
                  onChange={(e) => setFetchLimitRows(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          {submitMutation.error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-600/40 text-rose-300 text-xs font-mono">
              ! {submitMutation.error.message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="cyber"
              type="submit"
              icon={PlayCircle}
              loading={submitMutation.isPending}
            >
              Execute Ingestion
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

