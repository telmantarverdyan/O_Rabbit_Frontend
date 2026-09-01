import React, { useState } from 'react';
import { GitCommit, Clock, Layers, FileCode, CheckCircle2, ChevronRight, ArrowDownRight, Copy, Terminal, History } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useToast } from '@/components/common/Toast';
import { terminalSound } from '@/utils/terminalSound';

export interface IcebergSnapshot {
  snapshotId: string;
  parentId?: string;
  timestampMs: number;
  operation: 'append' | 'overwrite' | 'replace' | 'delete';
  summary: {
    addedDataFiles: number;
    addedRecords: number;
    totalDataFiles: number;
    totalRecords: number;
    totalBytes: number;
  };
  manifestList: string;
  schemaVersion: number;
}

interface SnapshotTreeProps {
  datasetKey: string;
  snapshots?: IcebergSnapshot[];
  onSelectSnapshot?: (snapshot: IcebergSnapshot) => void;
}

export const SnapshotTree: React.FC<SnapshotTreeProps> = ({ datasetKey, snapshots: customSnapshots }) => {
  const toast = useToast();
  
  // Realistic simulated Iceberg snapshots history if none provided
  const snapshots: IcebergSnapshot[] = customSnapshots || [
    {
      snapshotId: '8492048192049182',
      parentId: '7391038102938171',
      timestampMs: Date.now() - 4 * 60 * 1000,
      operation: 'append',
      summary: {
        addedDataFiles: 2,
        addedRecords: 48500,
        totalDataFiles: 14,
        totalRecords: 342000,
        totalBytes: 42 * 1024 * 1024,
      },
      manifestList: `s3://lakehouse/raw/${datasetKey}/metadata/snap-8492048192049182-1.avro`,
      schemaVersion: 2,
    },
    {
      snapshotId: '7391038102938171',
      parentId: '6182938102938160',
      timestampMs: Date.now() - 35 * 60 * 1000,
      operation: 'append',
      summary: {
        addedDataFiles: 4,
        addedRecords: 112000,
        totalDataFiles: 12,
        totalRecords: 293500,
        totalBytes: 36 * 1024 * 1024,
      },
      manifestList: `s3://lakehouse/raw/${datasetKey}/metadata/snap-7391038102938171-1.avro`,
      schemaVersion: 2,
    },
    {
      snapshotId: '6182938102938160',
      parentId: '5019283746152431',
      timestampMs: Date.now() - 120 * 60 * 1000,
      operation: 'replace',
      summary: {
        addedDataFiles: 1,
        addedRecords: 181500,
        totalDataFiles: 8,
        totalRecords: 181500,
        totalBytes: 24 * 1024 * 1024,
      },
      manifestList: `s3://lakehouse/raw/${datasetKey}/metadata/snap-6182938102938160-1.avro`,
      schemaVersion: 1,
    },
    {
      snapshotId: '5019283746152431',
      timestampMs: Date.now() - 360 * 60 * 1000,
      operation: 'append',
      summary: {
        addedDataFiles: 8,
        addedRecords: 181500,
        totalDataFiles: 8,
        totalRecords: 181500,
        totalBytes: 24 * 1024 * 1024,
      },
      manifestList: `s3://lakehouse/raw/${datasetKey}/metadata/snap-5019283746152431-1.avro`,
      schemaVersion: 1,
    },
  ];

  const [selectedSnap, setSelectedSnap] = useState<IcebergSnapshot>(snapshots[0]);

  const copySqlTimeTravel = (snap: IcebergSnapshot) => {
    const sql = `-- ClickHouse Time Travel Query for ${datasetKey}\nSELECT * FROM iceberg('http://ice-rest-catalog:5000', 'default', '${datasetKey.split('/').pop()}')\nFOR SYSTEM_VERSION AS OF ${snap.snapshotId}\nLIMIT 100;`;
    navigator.clipboard.writeText(sql);
    terminalSound.playSuccess();
    toast.success(`Copied Time-Travel SQL for Snapshot #${snap.snapshotId.slice(0, 8)}!`);
  };

  return (
    <div className="rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md p-5 shadow-terminal-sm space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-surface-border pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-100">
            [ICEBERG SNAPSHOT TIME-TRAVEL TREE]
          </h3>
          <span className="text-[10px] text-emerald-600 font-mono">
            ({snapshots.length} metadata commits)
          </span>
        </div>
        <span className="text-[10px] text-emerald-500/80">
          Dataset: <code className="text-emerald-300 font-bold">{datasetKey}</code>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Snapshots Tree Column */}
        <div className="lg:col-span-5 space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {snapshots.map((snap, idx) => {
            const isSelected = selectedSnap.snapshotId === snap.snapshotId;
            const isHead = idx === 0;

            return (
              <div
                key={snap.snapshotId}
                onClick={() => {
                  setSelectedSnap(snap);
                  terminalSound.playClick();
                }}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-start justify-between ${
                  isSelected
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-100 shadow-terminal-sm'
                    : 'bg-[#020504] border-surface-border text-emerald-500/80 hover:border-emerald-700/40 hover:text-emerald-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <GitCommit className={`h-3.5 w-3.5 ${isSelected ? 'text-[#00ff66]' : 'text-emerald-600'}`} />
                    <span className="font-bold font-mono">
                      snap-{snap.snapshotId.slice(0, 8)}
                    </span>
                    {isHead && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-[#00ff66] border border-emerald-500/40">
                        HEAD
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-emerald-600">
                    {new Date(snap.timestampMs).toLocaleTimeString()} • {snap.operation.toUpperCase()}
                  </div>
                </div>

                <div className="text-right text-[11px]">
                  <span className="text-emerald-300 font-bold block">
                    +{(snap.summary.addedRecords).toLocaleString()} rows
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    +{snap.summary.addedDataFiles} files
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Snapshot Details & Time-Travel Query Column */}
        <div className="lg:col-span-7 p-4 rounded-lg bg-[#020504] border border-surface-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-cyan-400" />
              <span>Snapshot Manifest Inspector</span>
            </div>
            <Button
              variant="cyber"
              size="sm"
              icon={Copy}
              onClick={() => copySqlTimeTravel(selectedSnap)}
            >
              Copy Time-Travel SQL
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-emerald-400 bg-surface-darker p-3 rounded-lg border border-surface-border">
            <div>
              <span className="text-emerald-600 block text-[10px]">SNAPSHOT ID</span>
              <span className="font-bold text-emerald-200">{selectedSnap.snapshotId}</span>
            </div>
            <div>
              <span className="text-emerald-600 block text-[10px]">PARENT SNAPSHOT</span>
              <span className="text-emerald-300">{selectedSnap.parentId || 'ROOT (INIT)'}</span>
            </div>
            <div>
              <span className="text-emerald-600 block text-[10px]">TOTAL CUMULATIVE ROWS</span>
              <span className="text-emerald-300 font-bold">{selectedSnap.summary.totalRecords.toLocaleString()} rows</span>
            </div>
            <div>
              <span className="text-emerald-600 block text-[10px]">PARQUET STORAGE SIZE</span>
              <span className="text-cyan-400 font-bold">{(selectedSnap.summary.totalBytes / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-terminal-dark border border-surface-border text-[11px] text-emerald-500/90 font-mono overflow-x-auto space-y-1">
            <span className="text-emerald-600 text-[10px] uppercase font-bold block">Manifest List Location:</span>
            <code className="text-emerald-300 block truncate">{selectedSnap.manifestList}</code>
          </div>
        </div>
      </div>
    </div>
  );
};
