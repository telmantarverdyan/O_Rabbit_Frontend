import React from 'react';
import { NavLink } from 'react-router-dom';
import { RabbitLogo } from '@/components/branding/RabbitLogo';
import {
  LayoutDashboard,
  PlayCircle,
  Briefcase,
  Database,
  Server,
  Layers,
  Settings,
  Sparkles,
  Terminal,
  Network,
  Clock,
  Archive,
  Bell,
  X,
  Command,
  Activity,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, tag: 'LIVE' },
  { to: '/runs', label: 'Ingestion Runs', icon: PlayCircle, tag: 'CORE' },
  { to: '/jobs', label: 'Export Jobs', icon: Briefcase },
  { to: '/schedules', label: 'Cron Schedules', icon: Clock },
  { to: '/lineage', label: 'Lineage & DAG', icon: Network },
  { to: '/connections', label: 'Connections', icon: Database },
  { to: '/workers', label: 'Worker Fleet', icon: Server, tag: 'FLEET' },
  { to: '/datasets', label: 'Lakehouse Tables', icon: Layers },
  { to: '/query', label: 'SQL Console', icon: Terminal, tag: 'SQL' },
  { to: '/maintenance', label: 'Compaction', icon: Archive },
  { to: '/alerts', label: 'Alerts & Incidents', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onClose }) => {
  return (
    <>
      {/* Mobile backdrop overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/90 backdrop-blur-md md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'w-64 flex-shrink-0 flex flex-col border-r border-surface-border bg-[#030805]/95 backdrop-blur-md z-40 transition-transform duration-300 md:translate-x-0 font-mono select-none',
          'fixed inset-y-0 left-0 md:static',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-surface-border bg-[#020504]">
          <RabbitLogo size="md" />

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1 rounded text-emerald-500 hover:text-emerald-200 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Command shortcut hint */}
        <div className="px-3 pt-3 pb-1">
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-900/40 text-[11px] text-emerald-400/80">
            <span className="flex items-center gap-1.5">
              <Command className="h-3 w-3 text-emerald-400" /> CLI Search
            </span>
            <kbd className="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-700/40 text-[10px] text-emerald-300">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  clsx(
                    'group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono transition-all duration-150',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/40 shadow-terminal-sm font-semibold'
                      : 'text-emerald-400/70 hover:text-emerald-200 hover:bg-emerald-950/30 hover:border-emerald-900/40 border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5">
                      <span className={clsx('text-xs font-bold transition-opacity', isActive ? 'text-emerald-400 opacity-100' : 'text-emerald-600 opacity-40 group-hover:opacity-80')}>
                        {isActive ? '›' : '·'}
                      </span>
                      <Icon className={clsx('h-3.5 w-3.5', isActive ? 'text-emerald-300' : 'text-emerald-500/70 group-hover:text-emerald-300')} />
                      <span>{item.label}</span>
                    </div>
                    {item.tag && (
                      <span className={clsx('text-[9px] px-1.5 py-0.2 rounded border font-mono', isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' : 'bg-emerald-950/40 text-emerald-600 border-emerald-900/30 group-hover:text-emerald-400')}>
                        {item.tag}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Terminal System Status Footprint */}
        <div className="p-3.5 border-t border-surface-border bg-[#020504] text-[10px] text-emerald-500/70 font-mono space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400/90 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#00ff66]" />
              MASTER_NODE_OK
            </span>
            <span className="text-emerald-600">v1.0.0</span>
          </div>
          <div className="flex items-center justify-between text-emerald-600/80 text-[9px]">
            <span>ENGINE: gRPC + S3</span>
            <span className="text-emerald-500">ICEBERG</span>
          </div>
        </div>
      </aside>
    </>
  );
};


