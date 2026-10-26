import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, Clock, Cpu, FileUp, Layers, Lock, Play, Server } from 'lucide-react';
import { fetchMetrics } from '@/api/metrics';
import { fetchWorkers } from '@/api/workers';
import { Button } from '@/components/common/Button';
import { MetricCard } from '@/components/common/MetricCard';
import { PageTitle, Panel, QueryState } from '@/components/common/QueryState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RunsTimeline, StatusStackBar, StatusLegend } from '@/components/dashboard/Charts';
import { useRecentRuns } from '@/components/dashboard/RunsDashboard';
import { formatTime, shortId } from '@/utils/format';
import { bucketRuns, formatSeconds, successRate } from '@/utils/runStats';
import { RunsTable, useJobNames } from './Runs';

const TASK_ORDER = ['SUCCEEDED', 'RUNNING', 'PENDING', 'FAILED', 'CANCELED', 'QUARANTINED'] as const;

export const Overview: React.FC = () => {
  const metricsQuery = useQuery({ queryKey: ['metrics'], queryFn: fetchMetrics, refetchInterval: 10000 });
  const runsQuery = useRecentRuns();
  const workersQuery = useQuery({ queryKey: ['workers', false], queryFn: () => fetchWorkers(false), refetchInterval: 10000 });
  const jobNames = useJobNames();

  const m = metricsQuery.data;
  const runTotals = m?.byLabel('orabbit_runs', 'status') ?? {};
  const taskTotals = m?.byLabel('orabbit_tasks', 'status') ?? {};
  const allRuns = Object.values(runTotals).reduce((a, b) => a + b, 0);
  const activeRuns = (runTotals.PLANNING ?? 0) + (runTotals.RUNNING ?? 0) + (runTotals.COMMITTING ?? 0);
  const rate = successRate(runTotals);
  const leasesActive = m?.scalar('orabbit_task_leases_active') ?? 0;
  const leasesExpired = m?.scalar('orabbit_task_leases_expired') ?? 0;
  const oldestCommit = m?.scalar('orabbit_oldest_committing_run_age_seconds');
  const blocked = m?.scalar('orabbit_registrations_blocked') ?? 0;

  const runs = runsQuery.data?.runs ?? [];
  const last24h = useMemo(() => bucketRuns(runs, 'hour', 24), [runs]);
  const recentFailures = runs.filter((r) => r.status === 'FAILED').slice(0, 5);
  const workers = workersQuery.data ?? [];
  const needsAttention = runs.filter((r) => r.operator_action_required).slice(0, 5);

  const tile = (v: number | string) => (metricsQuery.isLoading ? '…' : metricsQuery.error ? '—' : v);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Overview"
        subtitle="Live state of this master, its workers and recent runs."
        actions={
          <>
            <Link to="/runs/file"><Button variant="secondary" icon={FileUp}>From file</Button></Link>
            <Link to="/runs/new"><Button icon={Play}>New run</Button></Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Active runs" value={tile(activeRuns)} subtitle="planning · running · committing" icon={Activity} color="cyan" />
        <MetricCard title="Success rate" value={tile(rate === undefined ? '—' : `${rate}%`)} subtitle="all finished runs" icon={CheckCircle2} />
        <MetricCard title="Total runs" value={tile(allRuns.toLocaleString())} subtitle={`${(runTotals.FAILED ?? 0).toLocaleString()} failed`} icon={Layers} />
        <MetricCard title="Live workers" value={workersQuery.isLoading ? '…' : workers.length} subtitle="heartbeat < 30s" icon={Server} />
        <MetricCard title="Task leases" value={tile(leasesActive)} subtitle={leasesExpired ? `${leasesExpired} expired` : 'none expired'} icon={Lock} color={leasesExpired ? 'amber' : 'emerald'} />
        <MetricCard title="Oldest commit" value={tile(oldestCommit ? formatSeconds(oldestCommit) : '—')} subtitle={blocked ? `${blocked} registrations blocked` : 'committing run age'} icon={Clock} color={blocked ? 'amber' : 'emerald'} />
      </div>

      {metricsQuery.error != null && (
        <p role="alert" className="rounded-md border border-warn/30 bg-warn/10 px-4 py-2.5 text-sm text-warn">
          Could not read /metrics, so totals are unavailable. Recent-run charts below still work.
        </p>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Panel title="Runs, last 24 hours" description="Per hour, by status" className="lg:col-span-2">
          <QueryState isLoading={runsQuery.isLoading} error={runsQuery.error} onRetry={() => runsQuery.refetch()}>
            <RunsTimeline buckets={last24h} caption="Runs per hour over the last 24 hours" />
          </QueryState>
        </Panel>
        <div className="space-y-4">
          <Panel title="All runs by status" description="Since the master started recording">
            <StatusStackBar counts={runTotals} />
          </Panel>
          <Panel title="Tasks by status">
            <div className="space-y-3">
              <StatusStackBar counts={taskTotals} order={TASK_ORDER.filter((s) => s !== 'QUARANTINED')} />
              {(taskTotals.QUARANTINED ?? 0) > 0 && <StatusLegend counts={taskTotals} order={['QUARANTINED']} />}
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <Panel title="Workers" description="Active in the last 30 seconds" actions={<Link to="/workers" className="text-xs text-accent hover:underline">All workers →</Link>}>
          <QueryState isLoading={workersQuery.isLoading} error={workersQuery.error} isEmpty={!workers.length} emptyMessage="No live workers. Runs will wait.">
            <ul className="space-y-2">
              {workers.slice(0, 6).map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <Cpu className="h-4 w-4 flex-shrink-0 text-fg-subtle" aria-hidden />
                    <span className="truncate font-mono text-xs" title={w.id}>{w.id}</span>
                  </span>
                  <StatusBadge status={w.status} size="sm" />
                </li>
              ))}
            </ul>
          </QueryState>
        </Panel>

        <Panel title="Recent failures" actions={<Link to="/runs" className="text-xs text-accent hover:underline">All runs →</Link>}>
          <QueryState isLoading={runsQuery.isLoading} error={runsQuery.error} isEmpty={!recentFailures.length} emptyMessage="No failed runs recently.">
            <ul className="space-y-3">
              {recentFailures.map((r) => (
                <li key={r.id} className="min-w-0 text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link to={`/runs/${r.id}`} className="font-mono text-xs text-accent hover:underline">{shortId(r.id)}</Link>
                    <span className="text-xs text-fg-subtle">{formatTime(r.started_at)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 break-words text-xs text-danger">{r.error_summary || r.failure_class || 'No error summary'}</p>
                </li>
              ))}
            </ul>
          </QueryState>
        </Panel>

        <Panel title="Needs attention" description="Runs waiting for an operator">
          <QueryState isLoading={runsQuery.isLoading} error={runsQuery.error} isEmpty={!needsAttention.length} emptyMessage="Nothing needs an operator.">
            <ul className="space-y-2">
              {needsAttention.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <Link to={`/runs/${r.id}`} className="flex items-center gap-2 font-mono text-xs text-accent hover:underline">
                    <AlertTriangle className="h-3.5 w-3.5 text-warn" aria-hidden />
                    {shortId(r.id)}
                  </Link>
                  <StatusBadge status={r.status} size="sm" />
                </li>
              ))}
            </ul>
          </QueryState>
        </Panel>
      </div>

      <Panel title="Recent runs" flush actions={<Link to="/runs" className="text-xs text-accent hover:underline">All runs →</Link>}>
        <QueryState isLoading={runsQuery.isLoading} error={runsQuery.error} onRetry={() => runsQuery.refetch()} isEmpty={!runs.length} emptyMessage="No runs yet.">
          <RunsTable runs={runs.slice(0, 8)} jobNames={jobNames} />
        </QueryState>
      </Panel>
    </div>
  );
};
