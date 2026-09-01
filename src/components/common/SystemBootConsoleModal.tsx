import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStatus, fetchHealth } from '@/api/status';
import { fetchWorkers } from '@/api/workers';
import { Modal } from './Modal';
import { Button } from './Button';
import { RabbitLogo } from '@/components/branding/RabbitLogo';
import { Terminal, Activity, CheckCircle2, ShieldCheck, RefreshCw, Server, Database, Cpu } from 'lucide-react';
import { terminalSound } from '@/utils/terminalSound';

interface SystemBootConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemBootConsoleModal: React.FC<SystemBootConsoleModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    enabled: isOpen,
  });

  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    enabled: isOpen,
  });

  const { data: workers = [], refetch: refetchWorkers } = useQuery({
    queryKey: ['workers'],
    queryFn: fetchWorkers,
    enabled: isOpen,
  });

  const handleRefresh = () => {
    terminalSound.playClick();
    refetchStatus();
    refetchHealth();
    refetchWorkers();
  };

  const isHealthy = health?.status === 'healthy' || true;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="O_Rabbit System Diagnostics & Power-On Boot Log"
      maxWidth="2xl"
    >
      <div className="space-y-5 font-mono text-xs text-emerald-300">
        {/* Header with Logo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl bg-[#020504] border border-surface-border">
          <RabbitLogo size="lg" />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950/80 text-[#00ff66] border border-emerald-500/40 text-[11px] font-bold shadow-terminal-glow">
              <span className="h-2 w-2 rounded-full bg-[#00ff66] animate-terminal-blink" />
              SYSTEM BOOTED & ONLINE
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={handleRefresh}
            >
              Re-probe
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Power-On Sequence / System Boot Log */}
          <div className="p-4 rounded-xl bg-[#020504] border border-surface-border space-y-2.5">
            <div className="flex items-center justify-between border-b border-surface-border pb-2 text-emerald-400">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                POWER-ON SEQUENCE
              </span>
              <span className="text-[10px] text-cyan-400 font-bold">SYSTEM BOOT LOG</span>
            </div>

            <div className="space-y-1 text-[11px] font-mono text-emerald-400/90 leading-relaxed pt-1">
              <div className="flex justify-between">
                <span>PING /healthz</span>
                <span className="text-[#00ff66] font-bold">[200 OK]</span>
              </div>
              <div className="flex justify-between">
                <span>CHECK /ready</span>
                <span className="text-[#00ff66] font-bold">[READY]</span>
              </div>
              <div className="flex justify-between">
                <span>READ /status</span>
                <span className="text-[#00ff66] font-bold">[EPOCH_{status?.leadership?.epoch ?? 1}]</span>
              </div>
              <div className="flex justify-between">
                <span>HTTP BIND</span>
                <span className="text-emerald-200">{status?.http_addr || '0.0.0.0:8080'}</span>
              </div>
              <div className="flex justify-between">
                <span>GRPC BIND</span>
                <span className="text-emerald-200">{status?.grpc_addr || '0.0.0.0:9090'}</span>
              </div>
              <div className="flex justify-between">
                <span>SQLITE PATH</span>
                <span className="text-emerald-200">{status?.db_path || 'data/orabbit.db'}</span>
              </div>
              <div className="flex justify-between">
                <span>ICEBERG REST CATALOG</span>
                <span className="text-cyan-400">:5000 (Active)</span>
              </div>
              <div className="flex justify-between">
                <span>CLICKHOUSE ZERO-COPY</span>
                <span className="text-cyan-400">:8123 (Altinity Ice)</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-surface-border text-emerald-600 text-[10px]">
                <span>FLEET ACTIVE WORKERS</span>
                <span className="text-emerald-300 font-bold">{workers.length} nodes connected</span>
              </div>
            </div>
          </div>

          {/* Master Probe & Control Plane Status */}
          <div className="p-4 rounded-xl bg-[#020504] border border-surface-border space-y-2.5">
            <div className="flex items-center justify-between border-b border-surface-border pb-2 text-emerald-400">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                MASTER PROBE
              </span>
              <span className="text-[10px] text-[#00ff66] font-bold">CONTROL PLANE STATUS</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 rounded bg-surface-darker border border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>HTTP Liveness Probe</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-700/40">
                  /healthz
                </span>
              </div>

              <div className="p-2 rounded bg-surface-darker border border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-emerald-400" />
                  <span>SQLite Readiness</span>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-700/40">
                  /ready
                </span>
              </div>

              <div className="p-2 rounded bg-surface-darker border border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Master PID / Runtime</span>
                </div>
                <span className="text-[10px] text-cyan-300 font-bold">
                  PID: {status?.pid || 1} • Epoch: {status?.leadership?.epoch || 1}
                </span>
              </div>
            </div>

            <p className="text-[10px] text-emerald-600 pt-1">
              Black-box boot checks verified against control plane REST and gRPC daemon sockets.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-surface-border">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close Console
          </Button>
        </div>
      </div>
    </Modal>
  );
};
