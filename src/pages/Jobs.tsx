import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Play, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { createJob, deleteJob, fetchJobs, updateJob } from '@/api/jobs';
import { fetchConnections } from '@/api/connections';
import { startJobRun } from '@/api/runs';
import { ApiError, errorMessage } from '@/api/client';
import { Connection, Job, JobRequest, JsonObject } from '@/api/types';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Checkbox, PageTitle, Panel, QueryState, TextArea, tableClass, tdClass, thClass } from '@/components/common/QueryState';
import { Pagination } from '@/components/common/Pagination';
import { useToast } from '@/components/common/Toast';
import { usePagination } from '@/hooks/usePagination';
import { UrlFilterChip, useUrlQueryFilter } from '@/components/common/UrlFilter';
import { formatTime, parseJsonField, shortId } from '@/utils/format';

export const Jobs: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Job | 'new' | null>(null);
  const [running, setRunning] = useState<Job | null>(null);

  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
  const connectionsQuery = useQuery({ queryKey: ['connections'], queryFn: fetchConnections });
  const connectionName = (id: string) => connectionsQuery.data?.find((c) => c.id === id)?.name ?? shortId(id);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      toast.success('Job deleted.');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) => toast.error(errorMessage(err), 'Delete failed'),
  });

  const [urlQ, clearUrlQ] = useUrlQueryFilter();
  const jobs = useMemo(() => {
    const all = jobsQuery.data ?? [];
    const q = urlQ.toLowerCase();
    return q ? all.filter((j) => j.id.toLowerCase().includes(q) || j.name.toLowerCase().includes(q)) : all;
  }, [jobsQuery.data, urlQ]);
  // The master returns every job in one response (no paging on GET /jobs), so only rendering is paged.
  const pagination = usePagination(jobs);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Jobs"
        subtitle="Stored export definitions that use saved connections. Start one with Run."
        actions={<Button variant="cyber" icon={Plus} onClick={() => setEditing('new')}>New job</Button>}
      />
      <Panel title="Jobs" description={`${jobs.length.toLocaleString()} total`} flush actions={<Button variant="ghost" size="sm" icon={RefreshCw} loading={jobsQuery.isFetching} onClick={() => jobsQuery.refetch()}>Refresh</Button>}>
        <UrlFilterChip q={urlQ} onClear={clearUrlQ} />
        <QueryState isLoading={jobsQuery.isLoading} error={jobsQuery.error} onRetry={() => jobsQuery.refetch()} isEmpty={!jobs.length} emptyMessage="No jobs yet. One-shot runs from New Run also create a job.">
          <div>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={`${thClass} hidden lg:table-cell`}>Source → Target</th>
                  <th className={`${thClass} hidden md:table-cell`}>Target table</th>
                  <th className={`${thClass} hidden w-44 xl:table-cell`}>Mode</th>
                  <th className={`${thClass} hidden w-44 sm:table-cell`}>Updated</th>
                  <th className={`${thClass} w-40`}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((job) => (
                  <tr key={job.id} className="transition-colors hover:bg-raised/40">
                    <td className={tdClass}>
                      <div className="text-fg">{job.name}</div>
                      <div className="font-mono text-xs text-fg-subtle">{job.id}</div>
                    </td>
                    <td className={`${tdClass} hidden lg:table-cell`}>{connectionName(job.source_connection_id)} → {connectionName(job.target_connection_id)}</td>
                    <td className={`${tdClass} hidden truncate font-mono text-xs md:table-cell`}>{[job.target_namespace, job.target_table].filter(Boolean).join('.') || '—'}</td>
                    <td className={`${tdClass} hidden xl:table-cell`}>{job.write_mode}{job.incremental ? ` · incremental (${job.hwm_column ?? '?'})` : ''}</td>
                    <td className={`${tdClass} hidden text-fg-muted sm:table-cell`}>{formatTime(job.updated_at)}</td>
                    <td className={`${tdClass} space-x-1 text-right`}>
                      <Button size="sm" icon={Play} onClick={() => setRunning(job)}>Run</Button>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(job)} title="Edit" aria-label={`Edit ${job.name}`}>{''}</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        title="Delete"
                        aria-label={`Delete ${job.name}`}
                        onClick={() => {
                          if (window.confirm(`Delete job "${job.name}"?`)) deleteMutation.mutate(job.id);
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
          <Pagination state={pagination} noun="jobs" />
        </QueryState>
      </Panel>

      {editing && (
        <JobFormModal job={editing === 'new' ? null : editing} connections={connectionsQuery.data ?? []} onClose={() => setEditing(null)} />
      )}
      {running && <RunJobModal job={running} onClose={() => setRunning(null)} />}
    </div>
  );
};

const JobFormModal: React.FC<{ job: Job | null; connections: Connection[]; onClose: () => void }> = ({ job, connections, onClose }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const sources = connections.filter((c) => c.kind === 'source');
  const targets = connections.filter((c) => c.kind === 'target');
  const [form, setForm] = useState({
    name: job?.name ?? '',
    source_connection_id: job?.source_connection_id ?? sources[0]?.id ?? '',
    target_connection_id: job?.target_connection_id ?? targets[0]?.id ?? '',
    source_sql: job?.source_sql ?? '',
    target_namespace: job?.target_namespace ?? '',
    target_table: job?.target_table ?? '',
    write_mode: job?.write_mode ?? '',
    incremental: job?.incremental ?? false,
    hwm_column: job?.hwm_column ?? '',
    options_json: job?.options_json ? JSON.stringify(job.options_json, null, 2) : '',
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const req: JobRequest = {
        name: form.name.trim(),
        source_connection_id: form.source_connection_id,
        target_connection_id: form.target_connection_id,
        source_sql: form.source_sql,
        target_namespace: form.target_namespace.trim(),
        target_table: form.target_table.trim(),
        write_mode: form.write_mode.trim(),
        incremental: form.incremental,
        hwm_column: form.hwm_column.trim() || null,
        options_json: parseJsonField<JsonObject>(form.options_json, 'Options') ?? {},
      };
      return job ? updateJob(job.id, req) : createJob(req);
    },
    onSuccess: (saved) => {
      toast.success(`Job "${saved.name}" saved.`);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onClose();
    },
  });

  const fieldErrors = mutation.error instanceof ApiError ? mutation.error.fieldErrors : [];
  const toOptions = (list: Connection[]) => list.map((c) => ({ label: `${c.name} (${c.engine})`, value: c.id }));

  return (
    <Modal isOpen onClose={onClose} title={job ? `Edit job ${job.name}` : 'New job'} maxWidth="2xl">
      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="sm:col-span-2">
          <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <Select label="Source connection" value={form.source_connection_id} onChange={(e) => set('source_connection_id', e.target.value)} options={toOptions(sources)} helperText={sources.length ? undefined : 'Create a source connection first.'} />
        <Select label="Target connection" value={form.target_connection_id} onChange={(e) => set('target_connection_id', e.target.value)} options={toOptions(targets)} helperText={targets.length ? undefined : 'Create a target connection first.'} />
        <div className="sm:col-span-2">
          <TextArea label="Source SQL" rows={3} value={form.source_sql} onChange={(e) => set('source_sql', e.target.value)} placeholder="SELECT * FROM orders" helperText="Leave empty when options_json sets a table." />
        </div>
        <Input label="Target namespace" value={form.target_namespace} onChange={(e) => set('target_namespace', e.target.value)} />
        <Input label="Target table" value={form.target_table} onChange={(e) => set('target_table', e.target.value)} />
        <Input label="Write mode" value={form.write_mode} onChange={(e) => set('write_mode', e.target.value)} placeholder="append / overwrite (empty = default)" />
        <Input label="HWM column" value={form.hwm_column} onChange={(e) => set('hwm_column', e.target.value)} helperText="High-water-mark column for incremental runs." />
        <div className="sm:col-span-2">
          <Checkbox label="Incremental" checked={form.incremental} onChange={(v) => set('incremental', v)} />
        </div>
        <div className="sm:col-span-2">
          <TextArea
            label="Options (JSON)"
            rows={8}
            value={form.options_json}
            onChange={(e) => set('options_json', e.target.value)}
            placeholder={'{\n  "table": "public.orders",\n  "cursor_column": "id",\n  "planned_tasks": 8,\n  "consistency_mode": "EVENTUAL"\n}'}
            helperText="Validated by the master; unknown keys are rejected with a suggestion."
          />
        </div>
        {mutation.error && (
          <div role="alert" className="sm:col-span-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger break-words">
            <p>{mutation.error instanceof ApiError ? mutation.error.message : errorMessage(mutation.error)}</p>
            {fieldErrors.length > 0 && (
              <ul className="mt-1 list-disc pl-4">
                {fieldErrors.map((f) => <li key={`${f.field}-${f.error}`}>{f.field}: {f.error}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="sm:col-span-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>{job ? 'Save' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  );
};

const RunJobModal: React.FC<{ job: Job; onClose: () => void }> = ({ job, onClose }) => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [registrationConfig, setRegistrationConfig] = useState('');
  const mutation = useMutation({
    mutationFn: () => startJobRun(job.id, parseJsonField(registrationConfig, 'Registration config')),
    onSuccess: (res) => {
      toast.success(`Run ${shortId(res.run.id)} planned ${res.tasks.length} tasks.`, 'Run started');
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      navigate(`/runs/${res.run.id}`);
    },
  });
  return (
    <Modal isOpen onClose={onClose} title={`Run job ${job.name}`} subtitle="POST /jobs/{id}/runs">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <TextArea
          label="Iceberg registration config (JSON, optional)"
          rows={6}
          value={registrationConfig}
          onChange={(e) => setRegistrationConfig(e.target.value)}
          placeholder={'{\n  "enabled": true,\n  "engine": "rest-go",\n  "table": "analytics.orders"\n}'}
          helperText="Leave empty to use the job's stored settings."
        />
        {mutation.error && <p role="alert" className="break-words text-sm text-danger">{errorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="cyber" icon={Play} loading={mutation.isPending}>Start run</Button>
        </div>
      </form>
    </Modal>
  );
};
