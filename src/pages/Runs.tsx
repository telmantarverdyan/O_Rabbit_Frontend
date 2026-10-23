import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, XCircle } from 'lucide-react';
import { cancelRun, fetchRuns } from '@/api/runs';
import { errorMessage } from '@/api/client';
import { Run } from '@/api/types';
import { Button } from '@/components/common/Button';
import { Select } from '@/components/common/Input';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageTitle, Panel, QueryState, tableClass, tdClass, thClass } from '@/components/common/QueryState';
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

export const RunsTable: React.FC<{ runs: Run[] }> = ({ runs }) => {
  const cancel = useCancelRun();
  return (
    <div className="overflow-x-auto">
      <table className={tableClass}>
        <thead>
          <tr>
            <th className={thClass}>Run</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>Job</th>
            <th className={thClass}>Started</th>
            <th className={thClass}>Duration</th>
            <th className={thClass}>Error</th>
            <th className={thClass} />
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-emerald-950/20">
              <td className={tdClass}>
                <Link to={`/runs/${run.id}`} className="text-emerald-300 hover:underline" title={run.id}>{shortId(run.id)}</Link>
              </td>
              <td className={tdClass}><StatusBadge status={run.status} size="sm" /></td>
              <td className={`${tdClass} text-emerald-500/80`} title={run.job_id}>{shortId(run.job_id)}</td>
              <td className={`${tdClass} whitespace-nowrap`}>{formatTime(run.started_at)}</td>
              <td className={tdClass}>{formatDuration(run.started_at, run.finished_at)}</td>
              <td className={`${tdClass} max-w-xs truncate text-rose-300/80`} title={run.error_summary ?? ''}>{run.error_summary ?? ''}</td>
              <td className={`${tdClass} text-right`}>
                {ACTIVE_RUN_STATUSES.has(run.status) && run.status !== 'COMMITTING' && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={XCircle}
                    loading={cancel.isPending && cancel.variables === run.id}
                    onClick={() => {
                      if (window.confirm(`Cancel run ${run.id}?`)) cancel.mutate(run.id);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const Runs: React.FC = () => {
  // A stack of cursors: the last entry is the current page, '' is the first page.
  const [cursors, setCursors] = useState<string[]>(['']);
  const [status, setStatus] = useState('');
  const cursor = cursors[cursors.length - 1];

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['runs', cursor],
    queryFn: () => fetchRuns(PAGE_SIZE, cursor),
    refetchInterval: 5000,
  });

  // The master has no status filter, so this filters the loaded page only.
  const runs = (data?.runs ?? []).filter((r) => !status || r.status === status);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Runs"
        subtitle="Every export run on this master, newest first."
        actions={
          <Link to="/runs/new">
            <Button variant="cyber" icon={Plus}>New run</Button>
          </Link>
        }
      />
      <Panel
        title={`Page ${cursors.length}`}
        actions={
          <>
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUSES.map((s) => ({ label: s || 'All statuses', value: s }))}
            />
            <Button variant="ghost" size="sm" icon={RefreshCw} loading={isFetching} onClick={() => refetch()}>Refresh</Button>
            <Button variant="outline" size="sm" icon={ChevronLeft} disabled={cursors.length === 1} onClick={() => setCursors((c) => c.slice(0, -1))}>Newer</Button>
            <Button variant="outline" size="sm" icon={ChevronRight} disabled={!data?.nextCursor} onClick={() => setCursors((c) => [...c, data!.nextCursor])}>Older</Button>
          </>
        }
      >
        <QueryState isLoading={isLoading} error={error} onRetry={() => refetch()} isEmpty={!runs.length} emptyMessage={status ? `No ${status} runs on this page.` : 'No runs yet. Start one from "New run".'}>
          <RunsTable runs={runs} />
        </QueryState>
      </Panel>
    </div>
  );
};
