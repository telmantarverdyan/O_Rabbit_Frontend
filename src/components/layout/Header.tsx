import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Menu, RefreshCw, Server } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchStatus } from '@/api/status';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '../common/Button';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { session, logout } = useAuth();

  const { data: status, error, refetch, isFetching } = useQuery({
    queryKey: ['status'],
    queryFn: () => fetchStatus(),
    refetchInterval: 10000,
  });

  const leadership = status?.leadership;
  const healthy = !error && (leadership ? leadership.ready : !!status);
  const label = error ? 'UNREACHABLE' : leadership ? `${leadership.leadership_state} · epoch ${leadership.leadership_epoch}` : 'CONNECTED';

  return (
    <header className="h-16 border-b border-surface-border bg-[#020504]/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 font-mono select-none">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-emerald-500 hover:text-emerald-200 hover:bg-emerald-950/50 transition md:hidden"
          title="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div
          className="flex items-center gap-2 px-3 py-1 rounded-lg border border-surface-border bg-terminal-dark/80 text-xs min-w-0"
          title={error ? errorMessage(error) : 'Master status from GET /status'}
        >
          <span
            className={clsx(
              'h-2 w-2 flex-shrink-0 rounded-full',
              healthy ? 'bg-emerald-400 shadow-[0_0_6px_#00ff66]' : 'bg-rose-500 shadow-[0_0_6px_#ef4444]'
            )}
          />
          <Server className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
          <span className="truncate text-emerald-200">{session?.masterUrl}</span>
          <span className={clsx('hidden sm:inline truncate', healthy ? 'text-emerald-500/70' : 'text-rose-400')}>{label}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" icon={RefreshCw} loading={isFetching} onClick={() => refetch()} title="Refresh status">
          <span className="hidden sm:inline">Refresh</span>
        </Button>
        <Button variant="outline" size="sm" icon={LogOut} onClick={logout} title="Disconnect from this master">
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
};
