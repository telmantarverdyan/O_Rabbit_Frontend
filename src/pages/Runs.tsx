import React, { useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, FileUp, Plus, RefreshCw, RotateCw, XCircle } from 'lucide-react';
import { cancelRun, fetchRuns, startJobRun } from '@/api/runs';
import { errorMessage } from '@/api/client';
import { Run } from '@/api/types';
import { Button } from '@/components/common/Button';
import { fetchJobs } from '@/api/jobs';
import { RunsDashboard } from '@/components/dashboard/RunsDashboard';
import { countByStatus, STATUS_STYLE } from '@/utils/runStats';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageTitle, Panel, QueryState, rowClass, tableClass, tdClass, thClass } from '@/components/common/QueryState';
import { useToast } from '@/components/common/Toast';
import { ACTIVE_RUN_STATUSES, formatDuration, formatTime, shortId } from '@/utils/format';

const PAGE_SIZE = 50;
const STATUSES = ['', 'PLANNING', 'RUNNING', 'COMMITTING', 'SUCCEEDED', 'FAILED', 'CANCELED'];

/** Cancel button shared by the runs table and the run detail page. */
export function useCancelRun() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => cancelRun(id),
    onSuccess: (run) => {
      toast.success(`Run ${shortId(run.id)} is ${run.status.toLowerCase()}.`, 'Cancel requested');
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['run', run.id] });
    },
    onError: (err) => toast.error(errorMessage(err), 'Cancel failed'),
  });
}

/**
 * Starts a new run of the job behind an earlier run (POST /jobs/{id}/runs).
 * One-shot runs also store a job, so every run can be repeated this way.
 */
export function useRunAgain() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (jobId: string) => startJobRun(jobId),
    onSuccess: (res) => {
      toast.success(`Run ${shortId(res.run.id)} planned ${res.tasks.length} tasks.`, 'Run started');
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      navigate(`/runs/${res.run.id}`);
    },
    onError: (err) => toast.error(errorMessage(err), 'Run again failed'),
  });
}

/** Runs table that fits its container: fixed layout, secondary columns hide on narrow screens. */
export const RunsTable: React.FC<{ runs: Run[]; jobNames?: Record<string, string> }> = ({ runs, jobNames = {} }) => {
  const cancel = useCancelRun();
  const runAgain = useRunAgain();
  return (
    <table className={tableClass}>
      <thead>
        <tr>
          <th className={`${thClass} w-24 sm:w-28`}>Run</th>
          <th className={`${thClass} w-32`}>Status</th>
          <th className={`${thClass} hidden md:table-cell`}>Job</th>
          <th className={`${thClass} hidden w-40 lg:table-cell`}>Started</th>
          <th className={`${thClass} hidden w-24 xl:table-cell`}>Duration</th>
          <th className={`${thClass} hidden xl:table-cell`}>Error</th>
          <th className={`${thClass} w-16 text-right sm:w-32`}><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id} className={rowClass}>
            <td className={tdClass}>
              <Link to={`/runs/${run.id}`} className="font-mono text-xs text-accent hover:underline" title={run.id}>{shortId(run.id)}</Link>
            </td>
            <td className={tdClass}><StatusBadge status={run.status} size="sm" /></td>
            <td className={`${tdClass} hidden truncate md:table-cell`} title={run.job_id}>{jobNames[run.job_id] ?? <span className="font-mono text-xs text-fg-muted">{shortId(run.job_id)}</span>}</td>
            <td className={`${tdClass} hidden text-fg-muted lg:table-cell`}>{formatTime(run.started_at)}</td>
            <td className={`${tdClass} hidden tabular-nums xl:table-cell`}>{formatDuration(run.started_at, run.finished_at)}</td>
            <td className={`${tdClass} hidden truncate text-danger xl:table-cell`} title={run.error_summary ?? ''}>{run.error_summary ?? ''}</td>
            <td className={`${tdClass} text-right`}>
              {!ACTIVE_RUN_STATUSES.has(run.status) && run.job_id && (
                <Button
                  variant="ghost"
                  size="sm"
                  icon={RotateCw}
                  aria-label={`Run job of ${shortId(run.id)} again`}
                  title="Run again"
                  loading={runAgain.isPending && runAgain.variables === run.job_id}
                  onClick={() => runAgain.mutate(run.job_id)}
                >
                  {''}
                </Button>
              )}
              {ACTIVE_RUN_STATUSES.has(run.status) && run.status !== 'COMMITTING' && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  loading={cancel.isPending && cancel.variables === run.id}
                  aria-label={`Cancel run ${shortId(run.id)}`}
                  onClick={() => {
                    if (window.confirm(`Cancel run ${run.id}?`)) cancel.mutate(run.id);
                  }}
                >
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export function useJobNames(): Record<string, string> {
  const { data } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
  return useMemo(() => Object.fromEntries((data ?? []).map((j) => [j.id, j.name])), [data]);
}

export const Runs: React.FC = () => {
  // A stack of cursors: the last entry is the current page, '' is the first page.
  const [cursors, setCursors] = useState<string[]>(['']);
  const [status, setStatus] = useState('');
  const cursor = cursors[cursors.length - 1];
  const jobNames = useJobNames();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['runs', cursor],
    queryFn: () => fetchRuns(PAGE_SIZE, cursor),
    refetchInterval: 5000,
  });

  // The master has no status filter, so this filters the loaded page only.
  const pageRuns = data?.runs ?? [];
  const counts = countByStatus(pageRuns);
  const runs = pageRuns.filter((r) => !status || r.status === status);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Runs"
        subtitle="Run analytics and every export run on this master, newest first."
        actions={
          <>
            <Link to="/runs/file"><Button variant="secondary" icon={FileUp}>From file</Button></Link>
            <Link to="/runs/new"><Button icon={Plus}>New run</Button></Link>
          </>
        }
      />

      <RunsDashboard jobNames={jobNames} />

      <Panel
        title="All runs"
        description={`Page ${cursors.length} · ${PAGE_SIZE} per page`}
        flush
        actions={
          <>
            <Button variant="ghost" size="sm" icon={RefreshCw} loading={isFetching} onClick={() => refetch()} aria-label="Refresh runs">{''}</Button>
            <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={cursors.length === 1} onClick={() => setCursors((c) => c.slice(0, -1))}>Newer</Button>
            <Button variant="secondary" size="sm" icon={ChevronRight} disabled={!data?.nextCursor} onClick={() => setCursors((c) => [...c, data!.nextCursor])}>Older</Button>
          </>
        }
      >
        <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3" role="radiogroup" aria-label="Filter by status">
          {STATUSES.map((s) => {
            const n = s ? counts[s] ?? 0 : pageRuns.length;
            return (
              <button
                key={s || 'all'}
                type="button"
                role="radio"
                aria-checked={status === s}
                onClick={() => setStatus(s)}
                className={clsx(
                  'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
                  status === s ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-fg-muted hover:border-fg-subtle hover:text-fg'
                )}
              >
                {s && <span className={clsx('h-1.5 w-1.5 rounded-full', STATUS_STYLE[s]?.dot)} aria-hidden />}
                {s ? STATUS_STYLE[s]?.label ?? s : 'All'}
                <span className="tabular-nums text-fg-subtle">{n}</span>
              </button>
            );
          })}
        </div>
        <QueryState isLoading={isLoading} error={error} onRetry={() => refetch()} isEmpty={!runs.length} emptyMessage={status ? `No ${STATUS_STYLE[status]?.label.toLowerCase() ?? status} runs on this page.` : 'No runs yet. Start one from "New run".'}>
          <RunsTable runs={runs} jobNames={jobNames} />
        </QueryState>
      </Panel>
    </div>
  );
};
