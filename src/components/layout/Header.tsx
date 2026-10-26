import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Menu, RefreshCw } from 'lucide-react';
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
  const stateLabel = error ? 'Unreachable' : leadership ? `${leadership.leadership_state.toLowerCase()} · epoch ${leadership.leadership_epoch}` : 'Connected';

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between gap-3 border-b border-line bg-card/80 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button onClick={onToggleMobileMenu} className="cursor-pointer rounded-md p-2 text-fg-muted hover:bg-raised hover:text-fg md:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2.5" title={error ? errorMessage(error) : 'Master status from GET /status'}>
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0" aria-hidden>
            {healthy && <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />}
            <span className={clsx('relative inline-flex h-2.5 w-2.5 rounded-full', healthy ? 'bg-accent' : 'bg-danger')} />
          </span>
          <span className="truncate font-mono text-xs text-fg">{session?.masterUrl}</span>
          <span className={clsx('hidden truncate text-xs sm:inline', healthy ? 'text-fg-subtle' : 'text-danger')}>{stateLabel}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="sm" icon={RefreshCw} loading={isFetching} onClick={() => refetch()} aria-label="Refresh master status">{''}</Button>
        <Button variant="secondary" size="sm" icon={LogOut} onClick={logout}>
          <span className="hidden sm:inline">Disconnect</span>
        </Button>
      </div>
    </header>
  );
};
