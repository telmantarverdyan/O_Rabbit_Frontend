import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchConnections } from '@/api/connections';
import { fetchJobs } from '@/api/jobs';
import { fetchRuns } from '@/api/runs';
import { fetchWorkers } from '@/api/workers';
import {
  Database,
  Layers,
  Cpu,
  Server,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Info,
  CheckCircle2,
  HardDrive,
  Terminal,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface LineageNode {
  id: string;
  type: 'source' | 'engine' | 'storage' | 'catalog' | 'query';
  title: string;
  subtitle: string;
  status: 'active' | 'synced' | 'idle';
  details: Record<string, any>;
}

export const Lineage: React.FC = () => {
  const { data: connections = [] } = useQuery({ queryKey: ['connections'], queryFn: fetchConnections });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
  const { data: runs = [] } = useQuery({ queryKey: ['runs'], queryFn: fetchRuns });
  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: fetchWorkers });

  const [selectedNode, setSelectedNode] = useState<LineageNode | null>({
    id: 'engine-master',
    type: 'engine',
    title: 'O_Rabbit Master Planner',
    subtitle: 'gRPC & Pull Model',
    status: 'active',
    details: {
      'Active Workers': `${workers.length} nodes connected`,
      'Planning Model': 'Ordered Cursor & Hash Modulo',
      'Fault Tolerance': 'Task Leases & Fencing Tokens',
      'Target Parquet Size': '256 MB',
    },
  });

  const sourceConns = connections.filter((c) => c.kind === 'source' || c.engine !== 's3');
  const targetConns = connections.filter((c) => c.kind === 'target' || c.engine === 's3');
  const totalRows = runs.reduce((acc, r) => acc + (r.rows_total || 0), 0);

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
          <Layers className="h-5 w-5 text-emerald-400" />
          Data Lineage & Distributed Topology
        </h2>
        <p className="text-xs text-emerald-500/80 mt-0.5">
          End-to-end architectural data flow from operational databases into Apache Iceberg lakehouse tables.
        </p>
      </div>

      {/* Interactive Lineage DAG Pipeline */}
      <div className="p-6 rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-glow space-y-6 overflow-x-auto">
        <div className="min-w-[1100px] flex items-center justify-between gap-3">
          {/* Column 1: Source Databases */}
          <div className="space-y-3 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 pb-1 border-b border-surface-border">
              <Database className="h-3.5 w-3.5 text-cyan-400" />
              <span>[1. SOURCES ({sourceConns.length})]</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {sourceConns.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed border-surface-border text-emerald-700 text-xs font-mono">
                  [No sources added]
                </div>
              ) : (
                sourceConns.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() =>
                      setSelectedNode({
                        id: sc.id,
                        type: 'source',
                        title: `${String(sc.engine || 'DB').toUpperCase()} (${sc.name || sc.id.slice(0, 8)})`,
                        subtitle: 'Operational Source Database',
                        status: 'synced',
                        details: {
                          Engine: String(sc.engine || 'DB').toUpperCase(),
                          'Connection ID': sc.id,
                          Created: new Date(sc.created_at).toLocaleDateString(),
                        },
                      })
                    }
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between font-mono text-xs ${
                      selectedNode?.id === sc.id
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300 shadow-terminal-sm font-semibold'
                        : 'bg-[#020504] border-surface-border text-emerald-300 hover:border-emerald-500/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-emerald-100 truncate max-w-[110px]">
                        {sc.name || String(sc.engine || 'DB').toUpperCase()}
                      </div>
                      <div className="text-[10px] text-emerald-600">{sc.engine}</div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />
                  </button>
                ))
              )}
            </div>
          </div>

          <ArrowRight className="h-4 w-4 text-emerald-700 flex-shrink-0" />

          {/* Column 2: Export Jobs */}
          <div className="space-y-3 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 pb-1 border-b border-surface-border">
              <Layers className="h-3.5 w-3.5 text-emerald-400" />
              <span>[2. JOBS ({jobs.length})]</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {jobs.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed border-surface-border text-emerald-700 text-xs font-mono">
                  [No jobs created]
                </div>
              ) : (
                jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() =>
                      setSelectedNode({
                        id: job.id,
                        type: 'engine',
                        title: `Job: ${job.target_table || 'Export'}`,
                        subtitle: 'Extraction Job Specification',
                        status: 'synced',
                        details: {
                          'Target Table': job.target_table || 'table',
                          'HWM Cursor': job.hwm_column || 'id',
                          Incremental: job.incremental ? 'YES' : 'NO',
                          'Auto-Tune': job.options_json?.auto_tune ? 'Enabled' : 'Custom',
                        },
                      })
                    }
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between font-mono text-xs ${
                      selectedNode?.id === job.id
                        ? 'bg-emerald-950/60 border-emerald-400 text-emerald-100 shadow-terminal-sm font-semibold'
                        : 'bg-[#020504] border-surface-border text-emerald-400 hover:border-emerald-600/60'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-emerald-100 truncate max-w-[110px]">
                        {job.target_table || `job-${job.id.slice(0, 6)}`}
                      </div>
                      <div className="text-[10px] text-emerald-600">Cursor: {job.hwm_column || 'id'}</div>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
                  </button>
                ))
              )}
            </div>
          </div>

          <ArrowRight className="h-4 w-4 text-emerald-700 flex-shrink-0" />

          {/* Column 3: O_Rabbit Pull Workers */}
          <div className="space-y-3 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 pb-1 border-b border-surface-border">
              <Cpu className="h-3.5 w-3.5 text-emerald-400" />
              <span>[3. WORKERS]</span>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={() =>
                  setSelectedNode({
                    id: 'engine-master',
                    type: 'engine',
                    title: 'O_Rabbit Distributed Engine',
                    subtitle: 'Master Coordinator & Worker Fleet',
                    status: 'active',
                    details: {
                      'Connected Workers': `${workers.length} nodes`,
                      'Execution Mode': 'gRPC Pull Model (:9090)',
                      'Active Runs': `${runs.filter((r) => r.status === 'RUNNING').length}`,
                      'Ingested Rows': totalRows.toLocaleString(),
                    },
                  })
                }
                className={`w-full text-left p-3.5 rounded-xl border transition font-mono text-xs space-y-2 ${
                  selectedNode?.id === 'engine-master'
                    ? 'bg-emerald-950/40 border-emerald-400 text-emerald-200 shadow-terminal-glow font-semibold'
                    : 'bg-[#020504] border-surface-border text-emerald-300 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-100">Parallel Workers</span>
                  <span className="h-2 w-2 rounded-full bg-[#00ff66] shadow-[0_0_6px_#00ff66] animate-pulse" />
                </div>
                <div className="text-[11px] text-emerald-500/80">
                  {workers.length} nodes pulling Arrow batches
                </div>
                <div className="text-[10px] text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/40 inline-block">
                  Snappy Compression
                </div>
              </button>
            </div>
          </div>

          <ArrowRight className="h-4 w-4 text-emerald-700 flex-shrink-0" />

          {/* Column 4: S3 / MinIO Parquet Storage */}
          <div className="space-y-3 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 pb-1 border-b border-surface-border">
              <HardDrive className="h-3.5 w-3.5 text-purple-400" />
              <span>[4. S3 STORAGE]</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {targetConns.map((tc) => (
                <button
                  key={tc.id}
                  onClick={() =>
                    setSelectedNode({
                      id: tc.id,
                      type: 'storage',
                      title: `S3: ${tc.metadata_json?.bucket || 'Lakehouse Bucket'}`,
                      subtitle: 'Parquet Partition Storage',
                      status: 'synced',
                      details: {
                        Bucket: tc.metadata_json?.bucket || 'orabbit-lakehouse',
                        Region: tc.metadata_json?.region || 'us-east-1',
                        'File Format': 'Apache Parquet (v2)',
                        'Integrity Checks': 'SHA-256 Digest',
                      },
                    })
                  }
                  className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between font-mono text-xs ${
                    selectedNode?.id === tc.id
                      ? 'bg-purple-950/40 border-purple-500/60 text-purple-200 shadow-terminal-sm font-semibold'
                      : 'bg-[#020504] border-surface-border text-emerald-300 hover:border-emerald-500/40'
                  }`}
                >
                  <div>
                    <div className="font-bold text-emerald-100 truncate max-w-[110px]">
                      {tc.metadata_json?.bucket || 'S3 Bucket'}
                    </div>
                    <div className="text-[10px] text-emerald-600">_state.json HWM</div>
                  </div>
                  <span className="h-2 w-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
                </button>
              ))}
            </div>
          </div>

          <ArrowRight className="h-4 w-4 text-emerald-700 flex-shrink-0" />

          {/* Column 5: Iceberg Catalog & Query Engines */}
          <div className="space-y-3 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5 pb-1 border-b border-surface-border">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>[5. ICEBERG & CH]</span>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={() =>
                  setSelectedNode({
                    id: 'iceberg-catalog',
                    type: 'catalog',
                    title: 'Apache Iceberg REST Catalog',
                    subtitle: 'Metadata & Snapshot Management',
                    status: 'synced',
                    details: {
                      Catalog: 'REST Catalog (Altinity Ice)',
                      Tables: `${jobs.length} registered tables`,
                      Queryable: 'ClickHouse / DuckDB / Trino',
                      'Snapshot Isolation': 'ACID Atomic Commits',
                    },
                  })
                }
                className={`w-full text-left p-3.5 rounded-xl border transition font-mono text-xs space-y-2 ${
                  selectedNode?.id === 'iceberg-catalog'
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-terminal-sm font-semibold'
                    : 'bg-[#020504] border-surface-border text-emerald-300 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-100">ClickHouse / Ice</span>
                  <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                </div>
                <div className="text-[11px] text-emerald-500/80">Zero-copy Lakehouse Querying</div>
                <div className="text-[10px] text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-700/40 inline-block">
                  iceberg() Engine
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Node Details Inspector */}
      {selectedNode && (
        <div className="p-5 rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm space-y-4 font-mono">
          <div className="flex items-center justify-between border-b border-surface-border pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-700/40 text-emerald-400">
                <Info className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-200 text-sm font-mono glow-emerald">
                  {selectedNode.title}
                </h3>
                <span className="text-xs text-emerald-500/80">{selectedNode.subtitle}</span>
              </div>
            </div>
            <Link to="/query">
              <span className="text-xs text-emerald-400 hover:text-emerald-200 hover:underline flex items-center gap-1 font-mono">
                [OPEN SQL CONSOLE] <ExternalLink className="h-3 w-3" />
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(selectedNode.details).map(([key, value]) => (
              <div
                key={key}
                className="p-3 rounded-xl bg-[#020504] border border-surface-border font-mono space-y-1"
              >
                <div className="text-[10px] text-emerald-600 uppercase font-semibold">{key}</div>
                <div className="text-xs font-bold text-emerald-200">{String(value)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

