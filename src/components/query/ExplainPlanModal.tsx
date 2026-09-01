import React from 'react';
import { Modal } from '@/components/common/Modal';
import { GitBranch, Layers, CheckCircle2, ArrowRight, Zap, Database, HardDrive, Cpu } from 'lucide-react';

interface ExplainPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
}

export const ExplainPlanModal: React.FC<ExplainPlanModalProps> = ({ isOpen, onClose, query }) => {
  const planStages = [
    {
      id: 'stage-1',
      name: '1. Catalog Metadata Resolve & Partition Pruning',
      engine: 'Apache Iceberg REST Catalog',
      icon: Database,
      details: 'Pruned 6 of 8 date partitions based on WHERE filter predicate.',
      cost: '0.8ms',
      status: 'OPTIMAL',
      stats: { 'Partitions Scanned': '2 / 8', 'Skipped Files': '12 files (75% savings)' },
    },
    {
      id: 'stage-2',
      name: '2. S3 Columnar Parquet Scan (Direct MinIO)',
      engine: 'Altinity Ice Column Reader',
      icon: HardDrive,
      details: 'Zero-copy byte range requests reading required projection columns (id, user_name, amount).',
      cost: '14.2ms',
      status: 'PARALLEL_VECTORIZED',
      stats: { 'Byte Volume Read': '4.2 MB', 'Vector Batch Size': '65,536 rows' },
    },
    {
      id: 'stage-3',
      name: '3. Filter & Aggregation Evaluation',
      engine: 'ClickHouse Query Pipeline',
      icon: Cpu,
      details: 'SIMD-vectorized execution applying comparison filter and sorting result set.',
      cost: '2.1ms',
      status: 'OPTIMAL',
      stats: { 'Rows Evaluated': '189,400', 'Filtered Rows Out': '189,394' },
    },
    {
      id: 'stage-4',
      name: '4. Result Set Materialization & HTTP Stream',
      engine: 'O_Rabbit Query Dispatcher',
      icon: Zap,
      details: 'Streaming 6 rows JSON payload to Web UI client.',
      cost: '0.4ms',
      status: 'COMPLETED',
      stats: { 'Rows Output': '6 rows', 'Total Latency': '17.5ms' },
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ClickHouse & Iceberg Execution Plan (EXPLAIN)"
      subtitle="Detailed query execution DAG and partition skipping analysis"
      maxWidth="xl"
    >
      <div className="space-y-4 font-mono text-xs">
        <div className="p-3 rounded-lg bg-[#020504] border border-surface-border text-emerald-400">
          <span className="text-emerald-600 block text-[10px] uppercase font-bold">Query:</span>
          <code className="text-emerald-300 block truncate">{query}</code>
        </div>

        <div className="space-y-3">
          {planStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.id}
                className="p-4 rounded-xl border border-surface-border bg-surface/90 space-y-3 shadow-terminal-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-100 text-sm">
                    <Icon className="h-4 w-4 text-emerald-400" />
                    <span>{stage.name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-[#00ff66] border border-emerald-500/40">
                    {stage.cost}
                  </span>
                </div>

                <p className="text-xs text-emerald-500/80 font-mono">{stage.details}</p>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-surface-border text-[11px]">
                  {Object.entries(stage.stats).map(([k, v]) => (
                    <div key={k} className="p-2 rounded bg-[#020504] border border-surface-border">
                      <span className="text-emerald-600 block text-[9px] uppercase font-bold">{k}</span>
                      <span className="text-emerald-200 font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
