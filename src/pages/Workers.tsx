import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWorkers, drainWorker, pingWorker } from '@/api/workers';
import { MetricCard } from '@/components/common/MetricCard';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';
import { terminalSound } from '@/utils/terminalSound';
import { Server, Cpu, Activity, HardDrive, RefreshCw, Layers, CheckCircle2, Terminal, Radio, ShieldAlert, Power } from 'lucide-react';
import { Worker } from '@/api/types';

export const Workers: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [activeWorkerModal, setActiveWorkerModal] = useState<Worker | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [drainingId, setDrainingId] = useState<string | null>(null);

  const { data: workers = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
    refetchInterval: 3000,
  });

  const pingMutation = useMutation({
    mutationFn: async (workerId: string) => {
      setPingingId(workerId);
      return await pingWorker(workerId);
    },
    onSuccess: (res, workerId) => {
      setPingingId(null);
      terminalSound.playSuccess();
      toast.success(`Worker ${workerId.slice(0, 8)}: ${res.status} (${res.latencyMs}ms RTT)`);
    },
    onError: () => {
      setPingingId(null);
      terminalSound.playError();
      toast.error('Ping failed');
    },
  });

  const drainMutation = useMutation({
    mutationFn: async (workerId: string) => {
      setDrainingId(workerId);
      return await drainWorker(workerId);
    },
    onSuccess: (res, workerId) => {
      setDrainingId(null);
      terminalSound.playClick();
      toast.info(res.message);
      queryClient.invalidateQueries({ queryKey: ['workers'] });
    },
    onError: () => {
      setDrainingId(null);
      toast.error('Drain command rejected by master');
    },
  });

  const now = Date.now();

  const totalCPUs = workers.reduce(
    (acc, w) => acc + (w.capabilities_json?.cpus || 1),
    0
  );

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
            <Server className="h-5 w-5 text-emerald-400" />
            Worker Fleet Telemetry
          </h2>
          <p className="text-xs text-emerald-500/80 mt-0.5">
            Distributed execution nodes polling for partition tasks, extracting SQL rows, and streaming Parquet to S3.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={RefreshCw}
          size="sm"
          onClick={() => refetch()}
          loading={isFetching}
        >
          Refresh Fleet
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Active Workers"
          value={workers.length}
          subtitle="Polling gRPC Control Plane"
          icon={Server}
          color="emerald"
        />
        <MetricCard
          title="Total Worker Cores"
          value={totalCPUs}
          subtitle="Aggregate cluster CPU capacity"
          icon={Cpu}
          color="cyan"
        />
        <MetricCard
          title="Task Concurrency"
          value={workers.length > 0 ? `${workers.length}x parallel` : '0x'}
          subtitle="Pull-based task scheduling"
          icon={Activity}
          color="purple"
        />
      </div>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {workers.map((worker) => {
          const cap = worker.capabilities_json || {};
          const lastHbTime = new Date(worker.last_heartbeat).getTime();
          const ageSec = Math.max(0, Math.floor((now - lastHbTime) / 1000));
          const isHealthy = ageSec < 20;

          return (
            <div
              key={worker.id}
              className="p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm space-y-4 hover:border-emerald-500/40 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-700/40">
                    <Server className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-100 text-sm font-mono truncate max-w-[150px]">
                      {cap.hostname || `worker-${worker.id.slice(0, 8)}`}
                    </h3>
                    <span className="text-[10px] text-emerald-600 font-mono">
                      ID: {worker.id.slice(0, 12)}
                    </span>
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono border ${
                    isHealthy
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/40'
                      : 'bg-amber-950 text-amber-300 border-amber-700/40 animate-pulse'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${isHealthy ? 'bg-[#00ff66] shadow-[0_0_4px_#00ff66]' : 'bg-amber-400'}`} />
                  <span>{isHealthy ? '[ONLINE]' : `[LAG ${ageSec}s]`}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs font-mono bg-[#020504] p-3.5 rounded-lg border border-surface-border text-emerald-400">
                <div className="flex justify-between">
                  <span className="text-emerald-600">Address:</span>
                  <span className="text-emerald-200 font-semibold">{worker.addr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">OS / Arch:</span>
                  <span className="text-emerald-300">
                    {cap.os || 'linux'} / {cap.arch || 'amd64'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">CPU Cores:</span>
                  <span className="text-emerald-300 font-bold">{cap.cpus || 1} Cores</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">Go Runtime:</span>
                  <span className="text-emerald-400">{cap.go_version || 'go1.22'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-600">Process PID:</span>
                  <span className="text-emerald-300">{cap.pid || '—'}</span>
                </div>
              </div>

              <div className="text-[10px] text-emerald-600 font-mono flex items-center justify-between pt-1 border-t border-surface-border">
                <span>Heartbeat: {new Date(worker.last_heartbeat).toLocaleTimeString()}</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Ready
                </span>
              </div>

              {/* Operator Control Plane Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Radio}
                    loading={pingingId === worker.id}
                    onClick={() => pingMutation.mutate(worker.id)}
                  >
                    Ping
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
                    icon={Power}
                    loading={drainingId === worker.id}
                    onClick={() => {
                      if (window.confirm(`Gracefully drain worker ${worker.id}?`)) {
                        drainMutation.mutate(worker.id);
                      }
                    }}
                  >
                    Drain
                  </Button>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  icon={Layers}
                  onClick={() => setActiveWorkerModal(worker)}
                >
                  Tasks ({worker.active_tasks || 0})
                </Button>
              </div>
            </div>
          );
        })}

        {workers.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center text-emerald-700 border border-dashed border-emerald-950 rounded-xl space-y-3 font-mono text-xs">
            <p>[No active workers registered with master]</p>
            <p className="text-[11px] text-emerald-800">
              Start workers using: <code className="text-emerald-400">./deploy-worker.sh</code> or <code className="text-emerald-400">orabbit-worker</code>
            </p>
          </div>
        )}
      </div>

      {/* Active Worker Task Inspector Modal */}
      {activeWorkerModal && (
        <Modal
          isOpen={!!activeWorkerModal}
          onClose={() => setActiveWorkerModal(null)}
          title={`Worker Node: ${activeWorkerModal.capabilities_json?.hostname || activeWorkerModal.id.slice(0, 12)}`}
          subtitle={`Address: ${activeWorkerModal.addr} • gRPC Lease Socket`}
          maxWidth="lg"
        >
          <div className="space-y-4 font-mono text-xs text-emerald-300">
            <div className="p-3 bg-[#020504] rounded-lg border border-surface-border space-y-1.5">
              <div className="text-[10px] text-emerald-600 font-bold uppercase">Assigned Partition Leases:</div>
              <div className="text-emerald-200">
                {activeWorkerModal.active_tasks && activeWorkerModal.active_tasks > 0
                  ? `Processing ${activeWorkerModal.active_tasks} active task slices.`
                  : 'Idle (Heartbeating). Ready to claim next partition lease.'}
              </div>
              <div className="text-[11px] text-emerald-500/80">
                Worker runtime: {activeWorkerModal.capabilities_json?.go_version || 'go1.22'} on {activeWorkerModal.capabilities_json?.os || 'linux'}/{activeWorkerModal.capabilities_json?.arch || 'amd64'}.
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-border">
              <Button variant="ghost" size="sm" onClick={() => setActiveWorkerModal(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

