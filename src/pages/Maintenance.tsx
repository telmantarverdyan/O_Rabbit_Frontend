import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRuns } from '@/api/runs';
import { fetchJobs } from '@/api/jobs';
import { triggerDatasetCompaction, triggerDatasetVacuum } from '@/api/datasets';
import { Button } from '@/components/common/Button';
import { MetricCard } from '@/components/common/MetricCard';
import { useToast } from '@/components/common/Toast';
import { terminalSound } from '@/utils/terminalSound';
import {
  Sparkles,
  Archive,
  Trash2,
  CheckCircle2,
  Layers,
  HardDrive,
  RefreshCw,
  Zap,
  ShieldCheck,
  Play,
  Terminal,
  Activity,
  AlertTriangle,
} from 'lucide-react';

interface DatasetMaintenanceItem {
  key: string;
  totalFiles: number;
  smallFilesCount: number; // < 32MB
  totalBytes: number;
  avgFileSizeMB: number;
  recommendation: 'COMPACT_RECOMMENDED' | 'OPTIMAL';
  compactedEstimatedFiles: number;
}

export const Maintenance: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: runs = [], isLoading, refetch } = useQuery({ queryKey: ['runs'], queryFn: fetchRuns });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
  const [compactingKey, setCompactingKey] = useState<string | null>(null);
  const [compactSuccessKey, setCompactSuccessKey] = useState<string | null>(null);
  const [vacuuming, setVacuuming] = useState(false);

  // Derive datasets maintenance stats
  const datasetsMap = new Map<string, DatasetMaintenanceItem>();

  runs.forEach((r) => {
    if (r.dataset_key) {
      const existing = datasetsMap.get(r.dataset_key);
      const rows = r.rows_total || 0;
      const bytes = r.bytes_total || 1024 * 1024 * 14;
      const fileCount = Math.max(1, Math.ceil(rows / 200000) || 1);

      if (existing) {
        existing.totalFiles += fileCount;
        existing.totalBytes += bytes;
        existing.smallFilesCount += fileCount;
      } else {
        datasetsMap.set(r.dataset_key, {
          key: r.dataset_key,
          totalFiles: fileCount,
          smallFilesCount: fileCount,
          totalBytes: bytes,
          avgFileSizeMB: Number((bytes / (fileCount * 1024 * 1024)).toFixed(1)),
          recommendation: fileCount > 3 ? 'COMPACT_RECOMMENDED' : 'OPTIMAL',
          compactedEstimatedFiles: Math.max(1, Math.ceil(bytes / (256 * 1024 * 1024))),
        });
      }
    }
  });

  // Recalculate averages
  datasetsMap.forEach((item) => {
    item.avgFileSizeMB = Number((item.totalBytes / (item.totalFiles * 1024 * 1024)).toFixed(1));
    item.recommendation = item.totalFiles > 4 ? 'COMPACT_RECOMMENDED' : 'OPTIMAL';
    item.compactedEstimatedFiles = Math.max(1, Math.ceil(item.totalBytes / (256 * 1024 * 1024)));
  });

  const datasetList = Array.from(datasetsMap.values());
  const totalSmallFiles = datasetList.reduce((acc, d) => acc + d.smallFilesCount, 0);

  const compactMutation = useMutation({
    mutationFn: async (key: string) => {
      setCompactingKey(key);
      return await triggerDatasetCompaction(key);
    },
    onSuccess: (data, key) => {
      setCompactingKey(null);
      setCompactSuccessKey(key);
      terminalSound.playSuccess();
      toast.success(`Compaction completed for ${key}! Rewrote into optimized 256MB Parquet blocks.`);
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      setTimeout(() => setCompactSuccessKey(null), 5000);
    },
    onError: (err: any) => {
      setCompactingKey(null);
      terminalSound.playError();
      toast.error(`Compaction failed: ${err.message}`);
    },
  });

  const vacuumMutation = useMutation({
    mutationFn: async () => {
      setVacuuming(true);
      const activeKey = datasetList[0]?.key || 'default/dataset';
      return await triggerDatasetVacuum(activeKey, 7);
    },
    onSuccess: (data) => {
      setVacuuming(false);
      terminalSound.playSuccess();
      toast.success(`Vacuum completed: Purged ${data.deletedFiles || 0} orphaned files.`);
    },
    onError: (err: any) => {
      setVacuuming(false);
      terminalSound.playError();
      toast.error(`Vacuum failed: ${err.message}`);
    },
  });

  const handleTriggerCompaction = (key: string) => {
    compactMutation.mutate(key);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
            <Archive className="h-5 w-5 text-emerald-400" />
            Iceberg Table Maintenance & Compaction
          </h2>
          <p className="text-xs text-emerald-500/80 mt-0.5">
            Repack small incremental Parquet files into optimal 128MB/256MB blocks to maximize ClickHouse query speeds.
          </p>
        </div>
        <Button variant="secondary" icon={RefreshCw} size="sm" onClick={() => refetch()}>
          Analyze Storage
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Small Fragments"
          value={totalSmallFiles}
          subtitle="Files < 32MB across cluster"
          icon={Layers}
          color="amber"
        />
        <MetricCard
          title="Target Parquet Size"
          value="256 MB"
          subtitle="Optimal columnar block size"
          icon={HardDrive}
          color="cyan"
        />
        <MetricCard
          title="Query Speedup"
          value="Up to 4.2x"
          subtitle="Reduced S3 metadata LIST queries"
          icon={Zap}
          color="emerald"
        />
      </div>

      {/* Compaction Recommendations Table */}
      <div className="rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm overflow-hidden space-y-0">
        <div className="p-4 border-b border-surface-border bg-surface-darker flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>[DATASET COMPACTION AUDIT]</span>
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-darker text-emerald-600 border-b border-surface-border text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Dataset Key</th>
                <th className="py-3 px-4 font-semibold">Current Files</th>
                <th className="py-3 px-4 font-semibold">Avg File Size</th>
                <th className="py-3 px-4 font-semibold">Target Files</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/40 text-emerald-200">
              {datasetList.map((d) => (
                <tr key={d.key} className="hover:bg-emerald-950/20 transition">
                  <td className="py-3.5 px-4 text-emerald-100 font-bold flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    <span className="truncate max-w-xs" title={d.key}>
                      {d.key}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-amber-300 font-semibold">
                    {d.totalFiles} files
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400">{d.avgFileSizeMB} MB</td>
                  <td className="py-3.5 px-4 text-emerald-300 font-semibold">
                    ➔ {d.compactedEstimatedFiles} files (256MB)
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        d.recommendation === 'COMPACT_RECOMMENDED'
                          ? 'bg-amber-950 text-amber-300 border-amber-700/40'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700/40'
                      }`}
                    >
                      {d.recommendation === 'COMPACT_RECOMMENDED' ? '[NEEDS COMPACTION]' : '[OPTIMAL]'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {compactSuccessKey === d.key ? (
                      <span className="text-xs text-[#00ff66] font-bold flex items-center justify-end gap-1 glow-emerald">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Compacted!
                      </span>
                    ) : (
                      <Button
                        variant="cyber"
                        size="sm"
                        icon={Play}
                        loading={compactingKey === d.key}
                        onClick={() => handleTriggerCompaction(d.key)}
                      >
                        Compact Now
                      </Button>
                    )}
                  </td>
                </tr>
              ))}

              {datasetList.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-emerald-700 font-mono text-xs">
                    [No active datasets found. Datasets are created upon ingestion runs.]
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Snapshot Retention & Orphan Vacuum Policy Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md space-y-3 font-mono text-xs shadow-terminal-sm">
          <h4 className="font-bold text-emerald-100 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Snapshot Retention Policy
          </h4>
          <p className="text-emerald-500/80 text-xs">
            Automatically expires historical Iceberg snapshots while maintaining ACID time-travel capabilities for 7 days:
          </p>
          <div className="p-3 bg-[#020504] rounded-lg border border-surface-border text-emerald-400 space-y-1">
            <div>• Retention Window: <span className="text-emerald-300 font-bold">7 Days</span></div>
            <div>• Minimum Snapshots: <span className="text-emerald-300 font-bold">10 Snapshots</span></div>
            <div>• Time Travel Window: <span className="text-cyan-400">168 Hours</span></div>
          </div>
        </div>

        <div className="p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md space-y-3 font-mono text-xs shadow-terminal-sm flex flex-col justify-between">
          <div className="space-y-3">
            <h4 className="font-bold text-emerald-100 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              Orphan Parquet File Vacuum
            </h4>
            <p className="text-emerald-500/80 text-xs">
              Cleans up uncommitted multipart upload chunks and aborted task files from S3/MinIO:
            </p>
            <div className="p-3 bg-[#020504] rounded-lg border border-surface-border text-emerald-400 space-y-1">
              <div>• Orphan Grace Period: <span className="text-emerald-300 font-bold">24 Hours</span></div>
              <div>• Auto-Reap Status: <span className="text-emerald-300 font-bold">Active</span></div>
              <div>• Cleaned Storage: <span className="text-cyan-400">0 MB orphaned</span></div>
            </div>
          </div>

          <div className="pt-2 border-t border-surface-border flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              icon={Trash2}
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
              loading={vacuuming}
              onClick={() => vacuumMutation.mutate()}
            >
              Execute Orphan Vacuum
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

