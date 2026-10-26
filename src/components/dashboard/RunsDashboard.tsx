import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle2, Gauge, Timer, XCircle } from 'lucide-react';
import { fetchRuns } from '@/api/runs';
import { MetricCard } from '@/components/common/MetricCard';
import { Panel, QueryState, Segmented } from '@/components/common/QueryState';
import { ACTIVE_RUN_STATUSES, shortId } from '@/utils/format';
import { bucketRuns, countByStatus, durations, formatSeconds, percentile, successRate, topFailures } from '@/utils/runStats';
import { BarList, RunsTimeline, StatusStackBar } from './Charts';

/** How many recent runs the dashboards analyze (the master's page limit). */
export const DASHBOARD_RUN_LIMIT = 1000;

export function useRecentRuns() {
  return useQuery({
    queryKey: ['runs', 'dashboard'],
    queryFn: () => fetchRuns(DASHBOARD_RUN_LIMIT),
    refetchInterval: 15000,
  });
}

type Range = '24h' | '7d' | '30d';
const RANGES: Record<Range, { label: string; unit: 'hour' | 'day'; buckets: number; ms: number }> = {
  '24h': { label: '24 hours', unit: 'hour', buckets: 24, ms: 86_400_000 },
  '7d': { label: '7 days', unit: 'day', buckets: 7, ms: 7 * 86_400_000 },
  '30d': { label: '30 days', unit: 'day', buckets: 30, ms: 30 * 86_400_000 },
};

/** Run analytics for a time range: KPIs, runs over time, status split, failures and busiest jobs. */
export const RunsDashboard: React.FC<{ jobNames?: Record<string, string> }> = ({ jobNames = {} }) => {
  const [range, setRange] = useState<Range>('7d');
  const query = useRecentRuns();
  const cfg = RANGES[range];

  const stats = useMemo(() => {
    const since = Date.now() - cfg.ms;
    const runs = (query.data?.runs ?? []).filter((r) => new Date(r.started_at).getTime() >= since);
    const counts = countByStatus(runs);
    const d = durations(runs);
    const jobs = new Map<string, number>();
    for (const r of runs) jobs.set(r.job_id, (jobs.get(r.job_id) ?? 0) + 1);
    return {
      runs,
      counts,
      rate: successRate(counts),
      p50: percentile(d, 50),
      p95: percentile(d, 95),
      active: runs.filter((r) => ACTIVE_RUN_STATUSES.has(r.status)).length,
      buckets: bucketRuns(runs, cfg.unit, cfg.buckets),
      failures: topFailures(runs),
      busiest: [...jobs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [query.data, cfg]);

  // The window may be cut short when there are more runs than one page holds.
  const truncated = (query.data?.runs.length ?? 0) >= DASHBOARD_RUN_LIMIT && !!query.data?.nextCursor;

  return (
    <section className="space-y-4" aria-label="Runs dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-fg-subtle">
          {stats.runs.length.toLocaleString()} runs in the last {cfg.label}
          {truncated && ` (latest ${DASHBOARD_RUN_LIMIT} only)`}
        </p>
        <Segmented<Range> value={range} onChange={setRange} options={(Object.keys(RANGES) as Range[]).map((r) => ({ label: r, value: r }))} />
      </div>

      <QueryState isLoading={query.isLoading} error={query.error} onRetry={() => query.refetch()}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <MetricCard title="Runs" value={stats.runs.length.toLocaleString()} subtitle={`${stats.active} active now`} icon={Activity} />
          <MetricCard title="Success rate" value={stats.rate === undefined ? '—' : `${stats.rate}%`} subtitle="of finished runs" icon={CheckCircle2} />
          <MetricCard title="Failed" value={(stats.counts.FAILED ?? 0).toLocaleString()} subtitle={`${stats.counts.CANCELED ?? 0} canceled`} icon={XCircle} color="crimson" />
          <MetricCard title="Median time" value={formatSeconds(stats.p50)} subtitle="p50 duration" icon={Timer} />
          <MetricCard title="Slow runs" value={formatSeconds(stats.p95)} subtitle="p95 duration" icon={Gauge} className="col-span-2 lg:col-span-1" />
        </div>

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <Panel title="Runs over time" description={`Per ${cfg.unit}, by status`} className="lg:col-span-2">
            <RunsTimeline buckets={stats.buckets} caption={`Runs per ${cfg.unit} over the last ${cfg.label}`} />
          </Panel>
          <div className="space-y-4">
            <Panel title="Status split">
              <StatusStackBar counts={stats.counts} />
            </Panel>
            <Panel title="Top failures" description="By failure class">
              <BarList
                items={stats.failures.map((f) => ({ key: f.key, label: f.key, value: f.count, to: `/runs/${f.example.id}`, tone: 'bg-danger' }))}
                empty="No failed runs in this range."
              />
            </Panel>
          </div>
        </div>

        <Panel title="Busiest jobs" description="Runs started per job">
          <BarList
            items={stats.busiest.map(([jobId, n]) => ({ key: jobId, label: jobNames[jobId] ?? shortId(jobId), value: n }))}
            empty="No runs in this range."
          />
        </Panel>
      </QueryState>
    </section>
  );
};
