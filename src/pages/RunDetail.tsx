import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Database, FileText, LifeBuoy, RefreshCw, RotateCcw, Rows3, Stethoscope, XCircle } from 'lucide-react';
import {
  cancelRegistration,
  fetchRun,
  fetchRunArtifacts,
  fetchRunDiagnosis,
  fetchRunProgress,
  recoverRun,
  retryRegistration,
} from '@/api/runs';
import { errorMessage } from '@/api/client';
import { useRunSSE } from '@/api/sse';
import { RecoveryAction, RunEvent } from '@/api/types';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { LogConsole } from '@/components/common/LogConsole';
import { MetricCard } from '@/components/common/MetricCard';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageTitle, Panel, QueryState, TextArea, tableClass, tdClass, thClass } from '@/components/common/QueryState';
import { useToast } from '@/components/common/Toast';
import { TaskProgressChart } from '@/components/charts/TaskProgressChart';
import { ACTIVE_RUN_STATUSES, formatBytes, formatDuration, formatNumber, formatTime, shortId } from '@/utils/format';
import { useCancelRun } from './Runs';

const RECOVERY_ACTIONS: Array<{ label: string; value: RecoveryAction }> = [
  { label: 'reconcile_commit: re-check a stuck COMMITTING run', value: 'reconcile_commit' },
  { label: 'registration_retry: retry Iceberg registration', value: 'registration_retry' },
  { label: 'reconciliation_retry: retry commit reconciliation', value: 'reconciliation_retry' },
];

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wider text-emerald-500/70">{label}</dt>
    <dd className="truncate text-xs text-emerald-100" title={typeof children === 'string' ? children : undefined}>{children || '—'}</dd>
  </div>
);

export const RunDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const cancel = useCancelRun();
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  const runQuery = useQuery({
    queryKey: ['run', id],
    queryFn: () => fetchRun(id),
    // Poll while the run is moving; stop once it is final.
    refetchInterval: (q) => (q.state.data && !ACTIVE_RUN_STATUSES.has(q.state.data.run.status) ? false : 3000),
  });
  const run = runQuery.data?.run;
  const tasks = runQuery.data?.tasks ?? [];
  const active = !!run && ACTIVE_RUN_STATUSES.has(run.status);

  const progressQuery = useQuery({
    queryKey: ['run', id, 'progress'],
    queryFn: () => fetchRunProgress(id),
    refetchInterval: active ? 3000 : false,
    enabled: !!run,
  });
  const diagnosisQuery = useQuery({ queryKey: ['run', id, 'diagnosis'], queryFn: () => fetchRunDiagnosis(id), enabled: !!run });
  const artifactsQuery = useQuery({ queryKey: ['run', id, 'artifacts'], queryFn: () => fetchRunArtifacts(id), enabled: !!run && !active });

  const sse = useRunSSE(id);
  // The master replays stored events on every (re)connect, so keep one copy per event ID.
  const events = useMemo(() => {
    const byId = new Map<string, RunEvent>();
    for (const e of sse.events) byId.set(e.id, e);
    return [...byId.values()].sort((a, b) => a.ts.localeCompare(b.ts));
  }, [sse.events]);

  const refreshAll = () => queryClient.invalidateQueries({ queryKey: ['run', id] });

  const cancelRegistrationMutation = useMutation({
    mutationFn: () => cancelRegistration(id),
    onSuccess: () => {
      toast.success('Iceberg registration canceled.');
      refreshAll();
    },
    onError: (err) => toast.error(errorMessage(err), 'Cancel registration failed'),
  });

  const p = progressQuery.data?.progress;

  return (
    <div className="space-y-6">
      <Link to="/runs" className="inline-flex items-center gap-1 text-xs text-emerald-500 hover:text-emerald-300">
        <ArrowLeft className="h-3.5 w-3.5" /> All runs
      </Link>

      <QueryState isLoading={runQuery.isLoading} error={runQuery.error} onRetry={() => runQuery.refetch()}>
        {run && (
          <>
            <PageTitle
              title={`Run ${shortId(run.id)}`}
              subtitle={run.id}
              actions={
                <>
                  <StatusBadge status={run.status} size="lg" />
                  <Button variant="ghost" size="sm" icon={RefreshCw} onClick={refreshAll}>Refresh</Button>
                  {active && run.status !== 'COMMITTING' && (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={XCircle}
                      loading={cancel.isPending}
                      onClick={() => {
                        if (window.confirm(`Cancel run ${run.id}?`)) cancel.mutate(run.id);
                      }}
                    >
                      Cancel run
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" icon={LifeBuoy} onClick={() => setRecoverOpen(true)}>Recover</Button>
                </>
              }
            />

            {run.error_summary && (
              <div role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-300">
                <p className="font-semibold">
                  {run.failure_phase ? `Failed during ${run.failure_phase}` : 'Error'}
                  {run.failure_class ? ` · ${run.failure_class}` : ''}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{run.error_summary}</p>
              </div>
            )}
            {run.operator_action_required && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-xs text-amber-300">
                This run needs an operator. See the diagnosis below for the suggested action.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Tasks" value={p ? `${p.tasks_succeeded}/${p.tasks_total}` : `${tasks.length}`} subtitle={p ? `${p.tasks_running} running · ${p.tasks_failed} failed` : undefined} icon={Rows3} />
              <MetricCard title="Rows read" value={formatNumber(p?.rows_read ?? tasks.reduce((s, t) => s + t.rows_read, 0))} icon={Database} color="cyan" />
              <MetricCard title="Written" value={formatBytes(p?.bytes_written ?? tasks.reduce((s, t) => s + t.bytes_written, 0))} icon={FileText} color="purple" />
              <MetricCard title="Duration" value={formatDuration(run.started_at, run.finished_at)} subtitle={p ? `${p.workers_active} active workers` : undefined} icon={RotateCcw} color="amber" />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Panel title="Details" className="lg:col-span-2">
                <dl className="grid gap-4 sm:grid-cols-3">
                  <Field label="Job">{run.job_id}</Field>
                  <Field label="Dataset">{run.dataset_key}</Field>
                  <Field label="Correlation ID">{run.correlation_id}</Field>
                  <Field label="Started">{formatTime(run.started_at)}</Field>
                  <Field label="Finished">{formatTime(run.finished_at)}</Field>
                  <Field label="Readiness">{run.readiness}</Field>
                  <Field label="Data status">{run.data_status}</Field>
                  <Field label="Catalog status">{run.catalog_status}</Field>
                  <Field label="Commit phase">{run.commit_phase}</Field>
                  <Field label="Registration attempts">{String(run.registration_attempt ?? 0)}</Field>
                  <Field label="Registration error">{run.registration_error_class}</Field>
                  <Field label="Snapshot / metadata">{run.registered_snapshot_or_metadata_id}</Field>
                </dl>
                {(run.type_warnings?.length ?? 0) > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] text-amber-300">
                    <p className="font-semibold">Type warnings</p>
                    <ul className="mt-1 list-disc pl-4">
                      {run.type_warnings!.map((w, i) => (
                        <li key={i}>{w.column ? `${w.column}: ` : ''}{w.message ?? JSON.stringify(w)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" icon={RotateCcw} onClick={() => setRegistrationOpen(true)}>Retry Iceberg registration</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={XCircle}
                    loading={cancelRegistrationMutation.isPending}
                    onClick={() => {
                      if (window.confirm('Cancel the Iceberg registration for this run?')) cancelRegistrationMutation.mutate();
                    }}
                  >
                    Cancel registration
                  </Button>
                </div>
              </Panel>

              <Panel title="Task progress">
                {p ? (
                  <TaskProgressChart succeeded={p.tasks_succeeded} running={p.tasks_running} failed={p.tasks_failed} pending={p.tasks_pending} />
                ) : (
                  <QueryState isLoading={progressQuery.isLoading} error={progressQuery.error}>{null}</QueryState>
                )}
              </Panel>
            </div>

            <Panel title={<span className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Diagnosis</span>} actions={<Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => diagnosisQuery.refetch()}>Re-check</Button>}>
              <QueryState isLoading={diagnosisQuery.isLoading} error={diagnosisQuery.error}>
                {diagnosisQuery.data && (
                  <div className="space-y-2 text-xs">
                    <p>
                      <span className="text-emerald-500/70">Suggested next action: </span>
                      <span className="text-emerald-100">{diagnosisQuery.data.suggested_next_action || 'none'}</span>
                    </p>
                    {diagnosisQuery.data.last_classified_error && (
                      <p><span className="text-emerald-500/70">Last error: </span><span className="text-rose-300">{diagnosisQuery.data.last_classified_error}</span></p>
                    )}
                    <p className="text-emerald-500/70">
                      Task counts:{' '}
                      {Object.entries(diagnosisQuery.data.task_counts ?? {}).map(([k, v]) => `${k} ${v}`).join(' · ') || 'none'}
                    </p>
                  </div>
                )}
              </QueryState>
            </Panel>

            <Panel title={`Tasks (${tasks.length})`}>
              <QueryState isLoading={false} error={null} isEmpty={!tasks.length} emptyMessage="No tasks planned yet.">
                <div className="overflow-x-auto">
                  <table className={tableClass}>
                    <thead>
                      <tr>
                        <th className={thClass}>#</th>
                        <th className={thClass}>Status</th>
                        <th className={thClass}>Worker</th>
                        <th className={thClass}>Rows</th>
                        <th className={thClass}>Written</th>
                        <th className={thClass}>Attempts</th>
                        <th className={thClass}>Duration</th>
                        <th className={thClass}>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t) => (
                        <tr key={t.id}>
                          <td className={tdClass}>{t.task_index}</td>
                          <td className={tdClass}><StatusBadge status={t.status} size="sm" /></td>
                          <td className={tdClass} title={t.worker_id ?? ''}>{t.worker_id ?? '—'}</td>
                          <td className={tdClass}>{formatNumber(t.rows_read)}</td>
                          <td className={tdClass}>{formatBytes(t.bytes_written)}</td>
                          <td className={tdClass}>{t.attempt_count}</td>
                          <td className={tdClass}>{formatDuration(t.started_at, t.finished_at)}</td>
                          <td className={`${tdClass} max-w-xs break-words text-rose-300/80`}>{t.error_message ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </QueryState>
            </Panel>

            <div>
              <div className="mb-2 flex items-center justify-between text-[11px] text-emerald-500/70">
                <span>Live events: {sse.connectionState.toLowerCase()}{sse.retryCount ? ` (retry ${sse.retryCount})` : ''}</span>
                {sse.error && <span className="text-amber-400">{sse.error}</span>}
              </div>
              <LogConsole events={events} connected={sse.connected} runId={run.id} />
            </div>

            {!active && (
              <Panel title="Artifacts">
                <QueryState isLoading={artifactsQuery.isLoading} error={artifactsQuery.error} isEmpty={!artifactsQuery.data?.objects.length} emptyMessage="No committed Parquet objects.">
                  <div className="overflow-x-auto">
                    <table className={tableClass}>
                      <thead>
                        <tr>
                          <th className={thClass}>Object</th>
                          <th className={thClass}>Rows</th>
                          <th className={thClass}>Size</th>
                          <th className={thClass}>Task</th>
                        </tr>
                      </thead>
                      <tbody>
                        {artifactsQuery.data?.objects.map((o, i) => (
                          <tr key={i}>
                            <td className={`${tdClass} break-all`}>{String(o.object_key ?? o.key ?? o.path ?? JSON.stringify(o))}</td>
                            <td className={tdClass}>{o.row_count != null ? formatNumber(Number(o.row_count)) : '—'}</td>
                            <td className={tdClass}>{o.byte_size != null ? formatBytes(Number(o.byte_size)) : '—'}</td>
                            <td className={tdClass}>{shortId(o.task_id)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </QueryState>
              </Panel>
            )}

            <RecoverModal runId={run.id} isOpen={recoverOpen} onClose={() => setRecoverOpen(false)} onDone={refreshAll} />
            <RegistrationRetryModal runId={run.id} isOpen={registrationOpen} onClose={() => setRegistrationOpen(false)} onDone={refreshAll} />
          </>
        )}
      </QueryState>
    </div>
  );
};

interface ActionModalProps {
  runId: string;
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
}

const RecoverModal: React.FC<ActionModalProps> = ({ runId, isOpen, onClose, onDone }) => {
  const toast = useToast();
  const [action, setAction] = useState<RecoveryAction>('reconcile_commit');
  const [reason, setReason] = useState('');
  const mutation = useMutation({
    mutationFn: () => recoverRun(runId, action, reason.trim()),
    onSuccess: (res) => {
      toast.success(`${res.message || res.action}: run is ${res.status}.`, res.changed ? 'Recovered' : 'No change');
      onDone();
      onClose();
    },
  });
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Recover run" subtitle="Audited action (POST /runs/{id}/recover)">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <Select label="Action" value={action} onChange={(e) => setAction(e.target.value as RecoveryAction)} options={RECOVERY_ACTIONS} />
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="commit is overdue" helperText="Stored in the audit log." required />
        {mutation.error && <p role="alert" className="text-xs text-rose-300 break-words">{errorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" icon={LifeBuoy} loading={mutation.isPending} disabled={!reason.trim()}>Run action</Button>
        </div>
      </form>
    </Modal>
  );
};

const RegistrationRetryModal: React.FC<ActionModalProps> = ({ runId, isOpen, onClose, onDone }) => {
  const toast = useToast();
  const [configYaml, setConfigYaml] = useState('');
  const mutation = useMutation({
    mutationFn: () => retryRegistration(runId, configYaml),
    onSuccess: () => {
      toast.success('Iceberg registration was queued again.');
      onDone();
      onClose();
    },
  });
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Retry Iceberg registration">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <TextArea label="Override config YAML (optional)" rows={6} value={configYaml} onChange={(e) => setConfigYaml(e.target.value)} helperText="Leave empty to retry with the stored configuration." />
        {mutation.error && <p role="alert" className="text-xs text-rose-300 break-words">{errorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" icon={RotateCcw} loading={mutation.isPending}>Retry</Button>
        </div>
      </form>
    </Modal>
  );
};
