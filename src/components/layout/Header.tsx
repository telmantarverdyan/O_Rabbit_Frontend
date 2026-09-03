import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStatus, fetchHealth } from '@/api/status';
import { AuthTokenModal } from '../common/AuthTokenModal';
import { SystemBootConsoleModal } from '../common/SystemBootConsoleModal';
import { Button } from '../common/Button';
import { Key, ShieldCheck, RefreshCw, Menu, Terminal, Search, Activity, Cpu, Volume2, VolumeX, HelpCircle, Radio } from 'lucide-react';
import { getAuthToken } from '@/api/client';
import { terminalSound } from '@/utils/terminalSound';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleTerminal?: () => void;
  onOpenShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onOpenCommandPalette,
  onToggleTerminal,
  onOpenShortcuts,
}) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBootModalOpen, setIsBootModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(terminalSound.isEnabled());

  const { data: status, refetch: refetchStatus, isFetching } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
    refetchInterval: 10000,
    retry: 1,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    refetchInterval: 5000,
  });

  const hasToken = !!getAuthToken();
  const isHealthy = health?.status === 'healthy' || status?.status === 'HEALTHY';

  return (
    <header className="h-16 border-b border-surface-border bg-[#020504]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between font-mono select-none">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle button */}
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-emerald-500 hover:text-emerald-200 hover:bg-emerald-950/50 transition md:hidden"
          title="Open Navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Backend health status badge */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsBootModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg border border-surface-border hover:border-emerald-500/40 bg-terminal-dark/80 hover:bg-emerald-950/40 text-xs font-mono shadow-terminal-sm transition cursor-pointer group"
            title="Click to view full System Boot Log & Probe Diagnostics"
          >
            <span
              className={`h-2 w-2 rounded-full transition-all ${
                isHealthy
                  ? 'bg-emerald-400 shadow-[0_0_8px_#00ff66]'
                  : isFetching
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-rose-500'
              }`}
            />
            <span className="text-emerald-200 font-bold tracking-wider group-hover:text-[#00ff66]">
              {isHealthy
                ? 'MASTER_ONLINE'
                : isFetching
                ? 'RECONNECTING...'
                : 'OFFLINE_MOCK'}
            </span>
            {status && isHealthy && (
              <span className="text-emerald-500/60 hidden lg:inline border-l border-emerald-900/60 pl-2">
                PID:{status.pid} • {status.http_addr}
              </span>
            )}
          </button>
          {!isHealthy && (
            <button
              onClick={() => refetchStatus()}
              disabled={isFetching}
              className="p-1 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:text-amber-100 hover:bg-amber-900/50 transition disabled:opacity-50"
              title="Force reconnect to master backend"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {status?.leadership && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>Leader Epoch {status.leadership.epoch}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Command Palette search bar trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-surface-border bg-terminal-dark/60 hover:bg-terminal-card hover:border-emerald-500/40 text-xs text-emerald-500/70 hover:text-emerald-300 transition"
          title="Open Command Palette (Cmd+K)"
        >
          <Search className="h-3.5 w-3.5 text-emerald-400" />
          <span>Quick Command...</span>
          <kbd className="text-[10px] px-1 py-0.2 rounded bg-emerald-950 border border-emerald-800/40 text-emerald-400">
            ⌘K
          </kbd>
        </button>

        {/* CLI Terminal Shell Drawer Trigger */}
        <button
          onClick={onToggleTerminal}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/60 text-xs text-emerald-300 hover:text-emerald-100 transition shadow-terminal-glow"
          title="Toggle In-App CLI Shell [Ctrl + `]"
        >
          <Terminal className="h-3.5 w-3.5 text-[#00ff66]" />
          <span className="hidden md:inline font-bold">CLI [~]</span>
        </button>

        {/* Sound toggle button */}
        <button
          onClick={() => {
            const next = terminalSound.toggle();
            setSoundEnabled(next);
          }}
          className="p-2 rounded-lg text-emerald-500/70 hover:text-emerald-200 hover:bg-emerald-950/60 border border-surface-border transition"
          title={soundEnabled ? 'Mute terminal audio telemetry' : 'Enable terminal audio telemetry'}
        >
          {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-emerald-700" />}
        </button>

        {/* Shortcuts Cheat Sheet */}
        <button
          onClick={onOpenShortcuts}
          className="p-2 rounded-lg text-emerald-500/70 hover:text-emerald-200 hover:bg-emerald-950/60 border border-surface-border transition"
          title="Keyboard Shortcuts [?]"
        >
          <HelpCircle className="h-3.5 w-3.5 text-emerald-400" />
        </button>

        <button
          onClick={() => refetchStatus()}
          className="p-2 rounded-lg text-emerald-500/70 hover:text-emerald-200 hover:bg-emerald-950/60 border border-surface-border transition"
          title="Refresh connection status"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
        </button>

        <Button
          variant={hasToken ? 'secondary' : 'cyber'}
          size="sm"
          icon={Key}
          onClick={() => setIsAuthModalOpen(true)}
        >
          <span className="hidden sm:inline">
            {hasToken ? 'Auth: Set' : 'Configure Auth'}
          </span>
          <span className="sm:hidden">
            {hasToken ? 'Auth' : 'Token'}
          </span>
        </Button>

        <AuthTokenModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSaved={() => refetchStatus()}
        />

        <SystemBootConsoleModal
          isOpen={isBootModalOpen}
          onClose={() => setIsBootModalOpen(false)}
        />
      </div>
    </header>
  );
};



