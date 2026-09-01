import React, { useState } from 'react';
import { Database, Server, HardDrive, Layers, ArrowRight, ShieldCheck, Activity, Cpu, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { terminalSound } from '@/utils/terminalSound';

interface NodeInfo {
  id: string;
  name: string;
  type: 'SOURCE' | 'MASTER' | 'WORKER' | 'STORAGE' | 'ICEBERG';
  status: 'ONLINE' | 'ACTIVE' | 'SYNCING';
  metrics: Record<string, string | number>;
}

export const ClusterMesh: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<NodeInfo | null>({
    id: 'master-01',
    name: 'O_Rabbit Master gRPC Node',
    type: 'MASTER',
    status: 'ONLINE',
    metrics: {
      'Leader Epoch': 1,
      'gRPC Port': ':9090 (TLS)',
      'HTTP API': ':8080',
      'Lease Pool': '4 Active Slots',
      'Task Queue': '0 Backlog',
    },
  });

  const nodes: NodeInfo[] = [
    {
      id: 'src-pg',
      name: 'Postgres (Transactions)',
      type: 'SOURCE',
      status: 'ONLINE',
      metrics: { Engine: 'PostgreSQL 16', Rows: '1.42M', CDC: 'HWM Tracking (id)' },
    },
    {
      id: 'src-oracle',
      name: 'Oracle DB (Accounts)',
      type: 'SOURCE',
      status: 'ONLINE',
      metrics: { Engine: 'Oracle 19c', Rows: '890k', CDC: 'HWM Tracking (updated_at)' },
    },
    {
      id: 'master-01',
      name: 'Master Leader Node',
      type: 'MASTER',
      status: 'ONLINE',
      metrics: { 'Leader Epoch': 1, Port: ':9090', Status: 'Nominal' },
    },
    {
      id: 'worker-01',
      name: 'Worker Node #1 (Linux/amd64)',
      type: 'WORKER',
      status: 'SYNCING',
      metrics: { CPU: '8 Cores', Task: 'Part #0 (users)', Throughput: '48k rows/s' },
    },
    {
      id: 'worker-02',
      name: 'Worker Node #2 (Darwin/arm64)',
      type: 'WORKER',
      status: 'ACTIVE',
      metrics: { CPU: '10 Cores', Task: 'Part #1 (orders)', Throughput: '52k rows/s' },
    },
    {
      id: 'storage-s3',
      name: 'S3 MinIO Bucket (lakehouse)',
      type: 'STORAGE',
      status: 'ONLINE',
      metrics: { 'Committed Size': '42.8 MB', Checkpoints: '_state.json active', Objects: '14 Parquet files' },
    },
    {
      id: 'iceberg-ch',
      name: 'Iceberg REST + ClickHouse',
      type: 'ICEBERG',
      status: 'ONLINE',
      metrics: { 'Catalog URI': ':5000', Engine: 'Altinity Ice', 'Zero-Copy Query': 'Ready' },
    },
  ];

  return (
    <div className="rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md p-5 shadow-terminal-sm space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            [DISTRIBUTED CLUSTER TOPOLOGY MESH]
          </h3>
          <span className="text-[10px] text-emerald-600">(Real-Time Dataflow & Leases)</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-emerald-500/80">
          <span className="h-2 w-2 rounded-full bg-[#00ff66] shadow-[0_0_6px_#00ff66]" />
          <span>gRPC STREAMING NOMINAL</span>
        </div>
      </div>

      {/* Interactive Topology Graph Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative py-2">
        {/* Step 1: Sources */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-emerald-600 uppercase">1. Source Engines</div>
          {nodes.filter((n) => n.type === 'SOURCE').map((node) => (
            <div
              key={node.id}
              onClick={() => {
                setSelectedNode(node);
                terminalSound.playClick();
              }}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                selectedNode?.id === node.id
                  ? 'bg-emerald-950/80 border-emerald-400 shadow-terminal-sm text-emerald-100'
                  : 'bg-[#020504] border-surface-border text-emerald-400 hover:border-emerald-700/60'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Database className="h-3.5 w-3.5 text-emerald-400" />
                <span className="truncate">{node.name}</span>
              </div>
              <span className="text-[9px] text-emerald-600 block mt-1">Status: [{node.status}]</span>
            </div>
          ))}
        </div>

        {/* Step 2: Master Node */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-emerald-600 uppercase">2. Master Plane</div>
          {nodes.filter((n) => n.type === 'MASTER').map((node) => (
            <div
              key={node.id}
              onClick={() => {
                setSelectedNode(node);
                terminalSound.playClick();
              }}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                selectedNode?.id === node.id
                  ? 'bg-emerald-950/80 border-cyan-400 shadow-terminal-sm text-emerald-100'
                  : 'bg-[#020504] border-surface-border text-cyan-300 hover:border-cyan-700/60'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Server className="h-3.5 w-3.5 text-cyan-400" />
                <span className="truncate">{node.name}</span>
              </div>
              <span className="text-[9px] text-cyan-500/80 block mt-1">Leader Epoch: 1</span>
            </div>
          ))}
        </div>

        {/* Step 3: Workers */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-emerald-600 uppercase">3. Pull Workers</div>
          {nodes.filter((n) => n.type === 'WORKER').map((node) => (
            <div
              key={node.id}
              onClick={() => {
                setSelectedNode(node);
                terminalSound.playClick();
              }}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                selectedNode?.id === node.id
                  ? 'bg-emerald-950/80 border-emerald-400 shadow-terminal-sm text-emerald-100'
                  : 'bg-[#020504] border-surface-border text-emerald-400 hover:border-emerald-700/60'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                <span className="truncate">{node.name.split(' ')[0]}</span>
              </div>
              <span className="text-[9px] text-[#00ff66] block mt-1 animate-pulse">● {node.status}</span>
            </div>
          ))}
        </div>

        {/* Step 4: Storage */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-emerald-600 uppercase">4. S3 Storage</div>
          {nodes.filter((n) => n.type === 'STORAGE').map((node) => (
            <div
              key={node.id}
              onClick={() => {
                setSelectedNode(node);
                terminalSound.playClick();
              }}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                selectedNode?.id === node.id
                  ? 'bg-emerald-950/80 border-cyan-400 shadow-terminal-sm text-emerald-100'
                  : 'bg-[#020504] border-surface-border text-cyan-300 hover:border-cyan-700/60'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
                <span className="truncate">S3 / MinIO</span>
              </div>
              <span className="text-[9px] text-cyan-600 block mt-1">42.8 MB Parquet</span>
            </div>
          ))}
        </div>

        {/* Step 5: Iceberg Catalog */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-emerald-600 uppercase">5. Query Catalog</div>
          {nodes.filter((n) => n.type === 'ICEBERG').map((node) => (
            <div
              key={node.id}
              onClick={() => {
                setSelectedNode(node);
                terminalSound.playClick();
              }}
              className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                selectedNode?.id === node.id
                  ? 'bg-purple-950/80 border-purple-400 shadow-terminal-sm text-purple-100'
                  : 'bg-[#020504] border-surface-border text-purple-300 hover:border-purple-700/60'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold">
                <Layers className="h-3.5 w-3.5 text-purple-400" />
                <span className="truncate">Iceberg + CH</span>
              </div>
              <span className="text-[9px] text-purple-500/80 block mt-1">Zero-Copy Ready</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Node Telemetry Inspector */}
      {selectedNode && (
        <div className="p-3.5 rounded-lg bg-[#020504] border border-surface-border text-xs text-emerald-400 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-100 flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-[#00ff66]" />
              {selectedNode.name}
            </span>
            <span className="text-[10px] text-emerald-600">ID: {selectedNode.id}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-surface-border">
            {Object.entries(selectedNode.metrics).map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-surface-darker border border-surface-border">
                <span className="text-emerald-600 block text-[9px] uppercase font-bold">{k}</span>
                <span className="text-emerald-200 font-bold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
