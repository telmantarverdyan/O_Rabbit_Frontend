import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Clock, Database, FileText, LifeBuoy, RefreshCw, RotateCcw, RotateCw, Rows3, XCircle } from 'lucide-react';
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
import { PageTitle, Panel, QueryState, TextArea, rowClass, tableClass, tdClass, thClass } from '@/components/common/QueryState';
import { useToast } from '@/components/common/Toast';
import { TaskProgressBar } from '@/components/common/TaskProgressBar';
import { ACTIVE_RUN_STATUSES, formatBytes, formatDuration, formatNumber, formatTime, shortId } from '@/utils/format';
import { useCancelRun, useJobNames, useRunAgain } from './Runs';

const RECOVERY_ACTIONS: Array<{ label: string; value: RecoveryAction }> = [
  { label: 'reconcile_commit: re-check a stuck COMMITTING run', value: 'reconcile_commit' },
  { label: 'registration_retry: retry Iceberg registration', value: 'registration_retry' },
  { label: 'reconciliation_retry: retry commit reconciliation', value: 'reconciliation_retry' },
];

const Field: React.FC<{ label: string; children: React.ReactNode; title?: string }> = ({ label, children, title }) => (
  <div className="min-w-0">
    <dt className="text-xs text-fg-muted">{label}</dt>
    <dd className="mt-0.5 truncate text-sm text-fg" title={title ?? (typeof children === 'string' ? children : undefined)}>{children || '—'}</dd>
  </div>
);

export const RunDetail: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const toast = useToast();
  const queryClient = useQueryClient();
  const cancel = useCancelRun();
  const runAgain = useRunAgain();
  const jobNames = useJobNames();
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
  // Progress counters come from worker reports; after commit, the verified artifact
  // counters can be the only non-zero numbers, so show whichever is larger.
  const sum = (pick: (t: (typeof tasks)[number]) => number) => tasks.reduce((acc, t) => acc + (pick(t) || 0), 0);
  const artifactRows = sum((t) => t.artifact_rows);
  const artifactCount = sum((t) => t.artifact_count);
  const rowsTotal = Math.max(p?.rows_read ?? 0, sum((t) => t.rows_read), artifactRows);
  const bytesTotal = Math.max(p?.bytes_written ?? 0, sum((t) => t.bytes_written), sum((t) => t.artifact_bytes));
  const hasRegistration = !!run && (!!run.catalog_status || !!run.registration_id || run.registration_attempt > 0 || !!run.registration_error_class);

  return (
    <div className="space-y-6">
      <Link to="/runs" className="inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> All runs
      </Link>

      <QueryState isLoading={runQuery.isLoading} error={runQuery.error} onRetry={() => runQuery.refetch()}>
        {run && (
          <>
            <PageTitle
              title={`Run ${shortId(run.id)}`}
              subtitle={<span className="font-mono text-xs">{run.id}</span>}
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
                  {!active && run.job_id && (
                    <Button size="sm" icon={RotateCw} loading={runAgain.isPending} onClick={() => runAgain.mutate(run.job_id)} title="Start a new run of the same job">
                      Run again
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" icon={LifeBuoy} onClick={() => setRecoverOpen(true)}>Recover</Button>
                </>
              }
            />

            {run.error_summary && (
              <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
                <p className="font-semibold">
                  {run.failure_phase ? `Failed during ${run.failure_phase}` : 'Error'}
                  {run.failure_class ? ` · ${run.failure_class}` : ''}
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{run.error_summary}</p>
              </div>
            )}
            {run.operator_action_required && (
              <div className="rounded-lg border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
                This run needs an operator. See the diagnosis below for the suggested action.
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Tasks" value={p ? `${p.tasks_succeeded}/${p.tasks_total}` : `${tasks.length}`} subtitle={p ? `${p.tasks_running} running · ${p.tasks_failed} failed` : undefined} icon={Rows3} />
              <MetricCard title="Rows" value={formatNumber(rowsTotal)} subtitle={artifactRows > (p?.rows_read ?? 0) ? 'from committed files' : 'read from source'} icon={Database} />
              <MetricCard title="Written" value={formatBytes(bytesTotal)} subtitle={`${artifactCount} Parquet file${artifactCount === 1 ? '' : 's'}`} icon={FileText} />
              <MetricCard title="Duration" value={formatDuration(run.started_at, run.finished_at)} subtitle={p ? `${p.workers_active} active workers` : undefined} icon={Clock} />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-3">
              <Panel title="Details" className="lg:col-span-2">
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                  <Field label="Job">
                    <Link to="/jobs" className="text-accent hover:underline" title={run.job_id}>{jobNames[run.job_id] ?? shortId(run.job_id)}</Link>
                  </Field>
                  <Field label="Dataset" title={run.dataset_key}>{run.dataset_key}</Field>
                  <Field label="Correlation ID" title={run.correlation_id}>{run.correlation_id}</Field>
                  <Field label="Started">{formatTime(run.started_at)}</Field>
                  <Field label="Finished">{formatTime(run.finished_at)}</Field>
                  <Field label="Readiness">{run.readiness}</Field>
                  <Field label="Data status">{run.data_status}</Field>
                  <Field label="Commit phase">{run.commit_phase}</Field>
                  <Field label="Catalog status">{run.catalog_status}</Field>
                  {hasRegistration && (
                    <>
                      <Field label="Registration attempts">{String(run.registration_attempt ?? 0)}</Field>
                      <Field label="Registration error">{run.registration_error_class}</Field>
                      <Field label="Snapshot / metadata" title={run.registered_snapshot_or_metadata_id}>{run.registered_snapshot_or_metadata_id}</Field>
                    </>
                  )}
                </dl>
                {hasRegistration && (
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
                    <Button variant="secondary" size="sm" icon={RotateCcw} onClick={() => setRegistrationOpen(true)}>Retry Iceberg registration</Button>
                    <Button
                      variant="secondary"
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
                )}
              </Panel>

              <div className="space-y-6">
                <Panel title="Task progress">
                  {p ? (
                    <TaskProgressBar succeeded={p.tasks_succeeded} running={p.tasks_running} failed={p.tasks_failed} pending={p.tasks_pending} canceled={p.tasks_canceled} />
                  ) : (
                    <QueryState isLoading={progressQuery.isLoading} error={progressQuery.error}>{null}</QueryState>
                  )}
                </Panel>

                <Panel title="Diagnosis" actions={<Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => diagnosisQuery.refetch()} aria-label="Re-check diagnosis">{''}</Button>}>
                  <QueryState isLoading={diagnosisQuery.isLoading} error={diagnosisQuery.error}>
                    {diagnosisQuery.data && (
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-xs text-fg-muted">Suggested next action</dt>
                          <dd className="mt-0.5 break-words text-fg">{diagnosisQuery.data.suggested_next_action || 'None'}</dd>
                        </div>
                        {diagnosisQuery.data.last_classified_error && (
                          <div>
                            <dt className="text-xs text-fg-muted">Last error</dt>
                            <dd className="mt-0.5 break-words text-danger">{diagnosisQuery.data.last_classified_error}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-xs text-fg-muted">Task counts</dt>
                          <dd className="mt-0.5 break-words text-fg">
                            {Object.entries(diagnosisQuery.data.task_counts ?? {}).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(' · ') || 'none'}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </QueryState>
                </Panel>
              </div>
            </div>

            {(run.type_warnings?.length ?? 0) > 0 && (
              <Panel
                title={<span className="flex items-center gap-2 text-warn"><AlertTriangle className="h-4 w-4" aria-hidden /> Type warnings</span>}
                description="Columns stored with a fallback type. The data is complete; consider declaring an exact type."
                flush
              >
                <ul className="divide-y divide-line/70">
                  {run.type_warnings!.map((w) => (
                    <li key={w.column} className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,14rem)_minmax(0,1fr)] sm:gap-4">
                      <span className="truncate font-mono text-sm text-fg" title={w.column}>{w.column}</span>
                      <span className="break-words font-mono text-xs text-fg-muted">
                        {w.source_type || w.logical_type} <span className="text-fg-subtle">→</span> {w.target_type || w.storage_type}
                      </span>
                      <span className="break-words text-xs text-warn">{w.reason}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            <Panel title="Tasks" description={`${tasks.length} planned`} flush>
              <QueryState isLoading={false} error={null} isEmpty={!tasks.length} emptyMessage="No tasks planned yet.">
                <div>
                  <table className={tableClass}>
                    <thead>
                      <tr>
                        <th className={`${thClass} w-14`}>#</th>
                        <th className={`${thClass} w-32`}>Status</th>
                        <th className={`${thClass} hidden md:table-cell`}>Worker</th>
                        <th className={`${thClass} w-28 text-right`}>Rows</th>
                        <th className={`${thClass} hidden w-24 text-right sm:table-cell`}>Written</th>
                        <th className={`${thClass} hidden w-24 text-right lg:table-cell`}>Attempts</th>
                        <th className={`${thClass} hidden w-24 lg:table-cell`}>Duration</th>
                        <th className={`${thClass} hidden xl:table-cell`}>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((t) => (
                        <tr key={t.id} className={rowClass}>
                          <td className={`${tdClass} tabular-nums`}>{t.task_index}</td>
                          <td className={tdClass}><StatusBadge status={t.status} size="sm" /></td>
                          <td className={`${tdClass} hidden truncate font-mono text-xs md:table-cell`} title={t.worker_id ?? ''}>{t.worker_id ?? '—'}</td>
                          <td className={`${tdClass} text-right tabular-nums`}>{formatNumber(Math.max(t.rows_read, t.artifact_rows))}</td>
                          <td className={`${tdClass} hidden text-right tabular-nums sm:table-cell`}>{formatBytes(Math.max(t.bytes_written, t.artifact_bytes))}</td>
                          <td className={`${tdClass} hidden text-right tabular-nums lg:table-cell`}>{t.attempt_count}</td>
                          <td className={`${tdClass} hidden tabular-nums lg:table-cell`}>{formatDuration(t.started_at, t.finished_at)}</td>
                          <td className={`${tdClass} hidden break-words text-danger xl:table-cell`}>{t.error_message ?? ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </QueryState>
            </Panel>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-fg-muted">
                <span>Live events: {sse.connectionState.toLowerCase()}{sse.retryCount ? ` (retry ${sse.retryCount})` : ''}</span>
                {sse.error && <span className="text-warn">{sse.error}</span>}
              </div>
              <LogConsole events={events} connected={sse.connected} runId={run.id} />
            </div>

            {!active && (
              <Panel title="Artifacts" description="Committed Parquet objects" flush>
                <QueryState isLoading={artifactsQuery.isLoading} error={artifactsQuery.error} isEmpty={!artifactsQuery.data?.objects.length} emptyMessage="No committed Parquet objects.">
                  <div>
                    <table className={tableClass}>
                      <thead>
                        <tr>
                          <th className={thClass}>Object</th>
                          <th className={`${thClass} w-28 text-right`}>Rows</th>
                          <th className={`${thClass} hidden w-24 text-right sm:table-cell`}>Size</th>
                          <th className={`${thClass} hidden w-28 md:table-cell`}>Task</th>
                        </tr>
                      </thead>
                      <tbody>
                        {artifactsQuery.data?.objects.map((o, i) => (
                          <tr key={i} className={rowClass}>
                            <td className={`${tdClass} break-all font-mono text-xs`}>{String(o.object_key ?? o.key ?? o.path ?? '—')}</td>
                            <td className={`${tdClass} text-right tabular-nums`}>{o.row_count != null ? formatNumber(Number(o.row_count)) : '—'}</td>
                            <td className={`${tdClass} hidden text-right tabular-nums sm:table-cell`}>{o.byte_size != null ? formatBytes(Number(o.byte_size)) : '—'}</td>
                            <td className={`${tdClass} hidden font-mono text-xs md:table-cell`}>{shortId(o.task_id)}</td>
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
        {mutation.error && <p role="alert" className="break-words text-sm text-danger">{errorMessage(mutation.error)}</p>}
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
        {mutation.error && <p role="alert" className="break-words text-sm text-danger">{errorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="submit" icon={RotateCcw} loading={mutation.isPending}>Retry</Button>
        </div>
      </form>
    </Modal>
  );
};
