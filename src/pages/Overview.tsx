import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRuns } from '@/api/runs';
import { fetchWorkers } from '@/api/workers';
import { fetchJobs } from '@/api/jobs';
import { fetchConnections } from '@/api/connections';
import { fetchStatus } from '@/api/status';
import { getTableCatalogList } from '@/utils/tableCatalog';
import { MetricCard } from '@/components/common/MetricCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/common/Button';
import { ThroughputChart } from '@/components/charts/ThroughputChart';
import { TaskProgressChart } from '@/components/charts/TaskProgressChart';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ClusterMesh } from '@/components/topology/ClusterMesh';
import { RabbitLogo } from '@/components/branding/RabbitLogo';
import { Link } from 'react-router-dom';
import {
  PlayCircle,
  Server,
  Briefcase,
  Database,
  ArrowRight,
  Plus,
  Layers,
  Cpu,
  Flame,
  Terminal,
  Activity,
  Zap,
} from 'lucide-react';

export const Overview: React.FC = () => {
  const { data: runs = [] } = useQuery({
    queryKey: ['runs'],
    queryFn: fetchRuns,
    refetchInterval: 5000,
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
    refetchInterval: 5000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ['connections'],
    queryFn: fetchConnections,
  });

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
  });

  const activeRuns = runs.filter((r) => r.status === 'RUNNING' || r.status === 'PLANNING' || r.status === 'COMMITTING');
  const succeededRuns = runs.filter((r) => r.status === 'SUCCEEDED');
  const failedRuns = runs.filter((r) => r.status === 'FAILED');

  const catalogList = getTableCatalogList();
  const catalogTotalRows = catalogList.reduce((acc, t) => acc + t.rowsEstimate, 0);
  const catalogTotalBytes = catalogList.reduce((acc, t) => acc + t.sizeBytes, 0);

  const calculatedRunsRows = runs.reduce((acc, r) => acc + (r.rows_total || 0), 0);
  const calculatedRunsBytes = runs.reduce((acc, r) => acc + (r.bytes_total || 0), 0);

  const totalRows = calculatedRunsRows > 0 ? calculatedRunsRows : catalogTotalRows;
  const totalBytes = calculatedRunsBytes > 0 ? calculatedRunsBytes : catalogTotalBytes;
  const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6 font-mono">
      {/* Terminal Header Banner */}
      <div className="relative overflow-hidden p-5 sm:p-6 rounded-xl bg-gradient-to-r from-[#030a06] via-[#05140c] to-[#040f09] border border-surface-border shadow-terminal-glow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <RabbitLogo size="lg" compact />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#00ff66] shadow-[0_0_8px_#00ff66] animate-pulse" />
                <h2 className="text-lg sm:text-xl font-bold text-emerald-100 tracking-tight glow-emerald">
                  CONTROL PLANE TELEMETRY
                </h2>
              </div>
              <p className="text-xs text-emerald-500/80">
                Distributed high-throughput database extraction → Apache Iceberg Lakehouse Engine.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/runs">
              <Button variant="cyber" icon={Plus} size="md">
                Launch Ingestion Run
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Runs"
          value={activeRuns.length}
          subtitle={`${runs.length} lifetime executions`}
          icon={PlayCircle}
          color="emerald"
          trend={activeRuns.length > 0 ? 'ACTIVE' : 'IDLE'}
        />
        <MetricCard
          title="Worker Fleet"
          value={workers.length}
          subtitle="Online pull-model nodes"
          icon={Server}
          color="cyan"
          trend={`${workers.length}x pool`}
        />
        <MetricCard
          title="Export Jobs"
          value={jobs.length}
          subtitle={`${connections.length} db connections`}
          icon={Briefcase}
          color="purple"
        />
        <MetricCard
          title="Total Ingestion"
          value={`${totalGB} GB`}
          subtitle={`${totalRows.toLocaleString()} rows exported`}
          icon={Layers}
          color="amber"
        />
      </div>

      {/* Real-time Telemetry & Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ErrorBoundary compact fallbackTitle="Throughput Velocity Chart">
            <ThroughputChart
              data={runs.slice(0, 7).reverse().map((r, i) => ({
                time: `Run-${r?.id ? String(r.id).slice(0, 4) : i + 1}`,
                rowsPerSec: (r.rows_total || 0) / 10 || 5000 * (i + 1),
                mbPerSec: Number(((r.bytes_total || 0) / (1024 * 1024 * 10)).toFixed(1)) || 4.5 * (i + 1),
              }))}
              title="Cluster Ingestion Throughput Velocity"
              metric="both"
            />
          </ErrorBoundary>
        </div>
        <div>
          <ErrorBoundary compact fallbackTitle="Task Progress Breakdown Chart">
            <TaskProgressChart
              succeeded={succeededRuns.length}
              running={activeRuns.length}
              failed={failedRuns.length}
              pending={runs.filter((r) => r.status === 'PLANNING').length}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Active Runs In-Flight */}
      <div className="rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md p-5 shadow-terminal-sm space-y-4">
        <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-[#00ff66] animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono">
              [IN-FLIGHT RUNS ({activeRuns.length})]
            </h3>
          </div>
          <Link
            to="/runs"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono transition"
          >
            <span>inspect all runs</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {activeRuns.length === 0 ? (
          <div className="py-8 text-center text-emerald-700 text-xs font-mono border border-dashed border-emerald-950 rounded-lg">
            [No active partition runs in flight. Trigger an export job from the Jobs tab]
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeRuns.map((run, rIdx) => {
              const runIdStr = String(run?.id || rIdx);
              return (
                <Link
                  key={runIdStr}
                  to={`/runs/${runIdStr}`}
                  className="p-4 rounded-xl border border-surface-border bg-[#030805] hover:border-emerald-500/50 hover:bg-[#050e09] transition space-y-3 block shadow-terminal-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-emerald-300 font-semibold">
                        RUN-{runIdStr.slice(0, 8)}
                      </span>
                      <StatusBadge status={run.status} size="sm" />
                    </div>
                    <span className="text-[10px] text-emerald-600 font-mono">
                      {new Date(run.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-emerald-200/90 font-mono truncate">
                    <span className="text-emerald-500/70">Dataset:</span> {run.dataset_key || 'deriving...'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-emerald-500/70 font-mono border-t border-emerald-950 pt-2">
                    <span>Tasks: {run.tasks?.length || 0} scheduled</span>
                    <span className="text-emerald-400 font-semibold">
                      {run.rows_total ? `${run.rows_total.toLocaleString()} rows` : 'Streaming...'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Cluster Topology Mesh Graph */}
      <ClusterMesh />

      {/* Recent History & Cluster Health Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Runs Table */}
        <div className="lg:col-span-2 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md p-5 shadow-terminal-sm space-y-4">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-2">
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span>Recent Run Manifest History</span>
            </h3>
            <Link
              to="/runs"
              className="text-xs text-emerald-500 hover:text-emerald-300 flex items-center gap-1 font-mono transition"
            >
              All runs <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-surface-border text-emerald-600 text-[10px] uppercase">
                  <th className="pb-2 font-semibold">Run ID</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Timestamp</th>
                  <th className="pb-2 font-semibold">Extracted Rows</th>
                  <th className="pb-2 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-950/40 text-emerald-200">
                {runs.slice(0, 5).map((run, rIdx) => {
                  const runIdStr = String(run?.id || rIdx);
                  return (
                    <tr key={runIdStr} className="hover:bg-emerald-950/20 transition">
                      <td className="py-3 font-semibold text-emerald-300">
                        <Link to={`/runs/${runIdStr}`} className="hover:text-emerald-100 hover:underline">
                          RUN-{runIdStr.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={run.status} size="sm" />
                      </td>
                      <td className="py-3 text-emerald-600 text-[11px]">
                        {new Date(run.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3 text-emerald-300 font-semibold">
                        {run.rows_total ? run.rows_total.toLocaleString() : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={`/runs/${runIdStr}`}
                          className="text-emerald-400 hover:text-emerald-200 hover:underline font-mono text-xs"
                        >
                          [INSPECT]
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {runs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-emerald-700 font-mono">
                      [No runs recorded yet]
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Master Node & Worker Telemetry Card */}
        <div className="rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md p-5 shadow-terminal-sm space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-2">
              <Cpu className="h-3.5 w-3.5 text-cyan-400" />
              <span>Master Topology</span>
            </h3>
            <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/40">
              RPC_OK
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between py-1.5 border-b border-emerald-950/60">
              <span className="text-emerald-600">PID</span>
              <span className="text-emerald-200 font-semibold">{status?.pid || '—'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-emerald-950/60">
              <span className="text-emerald-600">HTTP REST</span>
              <span className="text-emerald-400">{status?.http_addr || ':8080'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-emerald-950/60">
              <span className="text-emerald-600">gRPC Fleet Port</span>
              <span className="text-cyan-400">{status?.grpc_addr || ':50051'}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-emerald-950/60">
              <span className="text-emerald-600">Worker Pool</span>
              <span className="text-emerald-300 font-semibold">{workers.length} nodes</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-emerald-600">SQLite Storage</span>
              <span className="text-emerald-400 truncate max-w-[140px]" title={status?.db_path}>
                {status?.db_path ? status.db_path.split('/').pop() : 'orabbit.db'}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <Link to="/workers" className="w-full block">
              <Button variant="secondary" size="sm" className="w-full" icon={Server}>
                Manage Worker Fleet
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

