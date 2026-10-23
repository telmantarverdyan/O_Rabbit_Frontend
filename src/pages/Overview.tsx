import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, Briefcase, CheckCircle2, Database, Plus, Server, XCircle } from 'lucide-react';
import { fetchRuns } from '@/api/runs';
import { fetchWorkers } from '@/api/workers';
import { fetchJobs } from '@/api/jobs';
import { fetchConnections } from '@/api/connections';
import { Button } from '@/components/common/Button';
import { MetricCard } from '@/components/common/MetricCard';
import { PageTitle, Panel, QueryState } from '@/components/common/QueryState';
import { ACTIVE_RUN_STATUSES } from '@/utils/format';
import { RunsTable } from './Runs';

const RECENT = 100;

export const Overview: React.FC = () => {
  const runsQuery = useQuery({ queryKey: ['runs', 'overview'], queryFn: () => fetchRuns(RECENT), refetchInterval: 5000 });
  const workersQuery = useQuery({ queryKey: ['workers', false], queryFn: () => fetchWorkers(false), refetchInterval: 10000 });
  const jobsQuery = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
  const connectionsQuery = useQuery({ queryKey: ['connections'], queryFn: fetchConnections });

  const runs = runsQuery.data?.runs ?? [];
  const count = (pred: (s: string) => boolean) => runs.filter((r) => pred(r.status)).length;
  const value = (q: { isLoading: boolean; error: unknown }, v: number) => (q.isLoading ? '…' : q.error ? 'error' : v);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Overview"
        subtitle={`Based on the latest ${RECENT} runs.`}
        actions={
          <Link to="/runs/new">
            <Button variant="cyber" icon={Plus}>New run</Button>
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard title="Active runs" value={value(runsQuery, count((s) => ACTIVE_RUN_STATUSES.has(s)))} icon={Activity} color="cyan" />
        <MetricCard title="Succeeded" value={value(runsQuery, count((s) => s === 'SUCCEEDED'))} icon={CheckCircle2} />
        <MetricCard title="Failed" value={value(runsQuery, count((s) => s === 'FAILED'))} icon={XCircle} color="crimson" />
        <MetricCard title="Live workers" value={value(workersQuery, workersQuery.data?.length ?? 0)} subtitle="heartbeat < 30s" icon={Server} color="purple" />
        <MetricCard title="Jobs" value={value(jobsQuery, jobsQuery.data?.length ?? 0)} icon={Briefcase} color="amber" />
        <MetricCard title="Connections" value={value(connectionsQuery, connectionsQuery.data?.length ?? 0)} icon={Database} color="slate" />
      </div>
      <Panel title="Recent runs" actions={<Link to="/runs" className="text-xs text-emerald-400 hover:underline">All runs →</Link>}>
        <QueryState isLoading={runsQuery.isLoading} error={runsQuery.error} onRetry={() => runsQuery.refetch()} isEmpty={!runs.length} emptyMessage="No runs yet.">
          <RunsTable runs={runs.slice(0, 10)} />
        </QueryState>
      </Panel>
    </div>
  );
};
