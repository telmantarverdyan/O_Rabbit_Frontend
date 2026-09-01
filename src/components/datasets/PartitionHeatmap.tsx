import React, { useState } from 'react';
import { Grid, Layers, Database, HardDrive, Zap, Info } from 'lucide-react';

interface PartitionCell {
  partitionKey: string;
  rowCount: number;
  fileSizeBytes: number;
  hwmCursor: string;
  status: 'COMMITTED' | 'OPTIMAL' | 'SKEWED' | 'IN_FLIGHT';
  filesCount: number;
}

interface PartitionHeatmapProps {
  datasetKey?: string;
  partitions?: PartitionCell[];
}

export const PartitionHeatmap: React.FC<PartitionHeatmapProps> = ({ datasetKey = 'default/users', partitions: customParts }) => {
  // Generate representative partition grid if not passed
  const partitions: PartitionCell[] = customParts || [
    { partitionKey: 'p_2026_08_25', rowCount: 125000, fileSizeBytes: 18 * 1024 * 1024, hwmCursor: 'id=125000', status: 'OPTIMAL', filesCount: 1 },
    { partitionKey: 'p_2026_08_26', rowCount: 142000, fileSizeBytes: 21 * 1024 * 1024, hwmCursor: 'id=267000', status: 'OPTIMAL', filesCount: 1 },
    { partitionKey: 'p_2026_08_27', rowCount: 189000, fileSizeBytes: 28 * 1024 * 1024, hwmCursor: 'id=456000', status: 'OPTIMAL', filesCount: 2 },
    { partitionKey: 'p_2026_08_28', rowCount: 310000, fileSizeBytes: 44 * 1024 * 1024, hwmCursor: 'id=766000', status: 'SKEWED', filesCount: 4 },
    { partitionKey: 'p_2026_08_29', rowCount: 98000, fileSizeBytes: 14 * 1024 * 1024, hwmCursor: 'id=864000', status: 'COMMITTED', filesCount: 1 },
    { partitionKey: 'p_2026_08_30', rowCount: 174000, fileSizeBytes: 26 * 1024 * 1024, hwmCursor: 'id=1038000', status: 'OPTIMAL', filesCount: 1 },
    { partitionKey: 'p_2026_08_31', rowCount: 245000, fileSizeBytes: 35 * 1024 * 1024, hwmCursor: 'id=1283000', status: 'OPTIMAL', filesCount: 2 },
    { partitionKey: 'p_2026_09_01', rowCount: 88000, fileSizeBytes: 12 * 1024 * 1024, hwmCursor: 'id=1371000', status: 'IN_FLIGHT', filesCount: 1 },
  ];

  const [activePart, setActivePart] = useState<PartitionCell | null>(partitions[0]);

  const maxRows = Math.max(...partitions.map((p) => p.rowCount));

  return (
    <div className="rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md p-5 shadow-terminal-sm space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <Grid className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            [PARTITION DISTRIBUTION & SKEW HEATMAP]
          </h3>
          <span className="text-[10px] text-emerald-600">({partitions.length} partitions)</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-emerald-500/80">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-emerald-500/30 border border-emerald-500/60" /> Optimal
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-amber-500/30 border border-amber-500/60" /> Skewed (&gt;300k)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-cyan-500/30 border border-cyan-500/60 animate-pulse" /> In-Flight
          </span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
        {partitions.map((p) => {
          const ratio = p.rowCount / maxRows;
          const isSelected = activePart?.partitionKey === p.partitionKey;

          let bgClass = 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300';
          if (p.status === 'SKEWED') {
            bgClass = 'bg-amber-950/60 border-amber-600/60 text-amber-300';
          } else if (p.status === 'IN_FLIGHT') {
            bgClass = 'bg-cyan-950/60 border-cyan-500/60 text-cyan-300 animate-pulse';
          }

          return (
            <div
              key={p.partitionKey}
              onClick={() => setActivePart(p)}
              className={`p-3 rounded-lg border text-center cursor-pointer transition-all hover:scale-[1.03] ${bgClass} ${
                isSelected ? 'ring-2 ring-[#00ff66] shadow-terminal-glow' : ''
              }`}
            >
              <div className="text-[10px] font-bold text-emerald-200 truncate">{p.partitionKey}</div>
              <div className="text-xs font-bold mt-1">{(p.rowCount / 1000).toFixed(0)}k rows</div>
              <div className="text-[9px] text-emerald-500/80 mt-0.5">
                {(p.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Partition Inspector Drawer */}
      {activePart && (
        <div className="p-3.5 rounded-lg bg-[#020504] border border-surface-border text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-emerald-400">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-surface-darker border border-surface-border text-emerald-300">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-emerald-100 text-sm">{activePart.partitionKey}</span>
              <div className="text-[10px] text-emerald-600">
                Cursor Checkpoint: <code className="text-emerald-300 font-bold">{activePart.hwmCursor}</code>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] text-emerald-600 block">ROWS</span>
              <span className="font-bold text-emerald-200">{activePart.rowCount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 block">PARQUET FILES</span>
              <span className="font-bold text-cyan-400">{activePart.filesCount} file(s)</span>
            </div>
            <div>
              <span className="text-[10px] text-emerald-600 block">COMPACTION HEALTH</span>
              <span className={`font-bold ${activePart.status === 'SKEWED' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {activePart.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
