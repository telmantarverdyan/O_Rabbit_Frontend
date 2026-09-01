import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  PlayCircle,
  Briefcase,
  Layers,
  Database,
  Server,
  Terminal,
  Clock,
  Archive,
  Bell,
  Settings,
  X,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CommandItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
}

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const handleOpen = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  // Global shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands: CommandItem[] = [
    {
      id: 'nav-overview',
      category: 'Navigation',
      title: 'Overview & Control Plane',
      subtitle: 'System telemetry and master cluster status',
      icon: Terminal,
      action: () => { navigate('/'); handleClose(); },
      shortcut: 'G O',
    },
    {
      id: 'nav-runs',
      category: 'Navigation',
      title: 'Ingestion Runs',
      subtitle: 'Inspect live batch execution, tasks, and commits',
      icon: PlayCircle,
      action: () => { navigate('/runs'); handleClose(); },
      shortcut: 'G R',
    },
    {
      id: 'nav-jobs',
      category: 'Navigation',
      title: 'Export Jobs',
      subtitle: 'Configure source tables, high-water marks, and destinations',
      icon: Briefcase,
      action: () => { navigate('/jobs'); handleClose(); },
      shortcut: 'G J',
    },
    {
      id: 'nav-query',
      category: 'Navigation',
      title: 'SQL Query Console',
      subtitle: 'Execute zero-copy SQL against Apache Iceberg tables',
      icon: Terminal,
      action: () => { navigate('/query'); handleClose(); },
      shortcut: 'G Q',
    },
    {
      id: 'nav-lineage',
      category: 'Navigation',
      title: 'Data Lineage & Topology',
      subtitle: 'Inspect source to Iceberg DAG data flows',
      icon: Layers,
      action: () => { navigate('/lineage'); handleClose(); },
    },
    {
      id: 'nav-workers',
      category: 'Navigation',
      title: 'Worker Fleet',
      subtitle: 'Monitor node heartbeats, CPUs, and pull-model tasks',
      icon: Server,
      action: () => { navigate('/workers'); handleClose(); },
    },
    {
      id: 'nav-datasets',
      category: 'Navigation',
      title: 'Lakehouse Datasets',
      subtitle: 'View S3 Parquet manifests and _state.json HWM checkpoints',
      icon: Database,
      action: () => { navigate('/datasets'); handleClose(); },
    },
    {
      id: 'nav-schedules',
      category: 'Navigation',
      title: 'Cron Schedules',
      subtitle: 'Automated CDC and batch ingestion triggers',
      icon: Clock,
      action: () => { navigate('/schedules'); handleClose(); },
    },
    {
      id: 'nav-maintenance',
      category: 'Navigation',
      title: 'Compaction & Vacuum',
      subtitle: 'Repack small Parquet files into 256MB blocks',
      icon: Archive,
      action: () => { navigate('/maintenance'); handleClose(); },
    },
    {
      id: 'nav-alerts',
      category: 'Navigation',
      title: 'Alerts & Incidents',
      subtitle: 'Cluster health monitors and webhook notifications',
      icon: Bell,
      action: () => { navigate('/alerts'); handleClose(); },
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'System Settings',
      subtitle: 'Auth tokens, backend proxy, and Prometheus telemetry',
      icon: Settings,
      action: () => { navigate('/settings'); handleClose(); },
    },
  ];

  const filtered = commands.filter(
    (c) =>
      c.title.toLowerCase().includes(query.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 font-mono">
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-emerald-500/50 bg-[#050c08] shadow-terminal-glow transition-all z-10 flex flex-col">
        {/* Terminal Command Input Header */}
        <div className="flex items-center gap-3 border-b border-surface-border bg-[#030805] px-4 py-3.5">
          <span className="text-emerald-400 font-bold select-none text-sm">$</span>
          <input
            type="text"
            placeholder="Type a command or jump to view (e.g. runs, query, jobs)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="flex-1 bg-transparent text-sm text-emerald-100 placeholder-emerald-700/60 focus:outline-none font-mono"
          />
          <div className="flex items-center gap-1 text-[10px] text-emerald-500/60 border border-emerald-900/50 px-1.5 py-0.5 rounded">
            <span>ESC to exit</span>
          </div>
        </div>

        {/* Command List Results */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-emerald-950/40">
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isSelected = idx === selectedIndex;
            return (
              <button
                key={item.id}
                onClick={item.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition text-xs ${
                  isSelected
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 shadow-terminal-sm'
                    : 'text-emerald-400/80 hover:bg-emerald-950/40 hover:text-emerald-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-surface-darker text-emerald-600 border-surface-border'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-emerald-100 flex items-center gap-2">
                      <span>{item.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-800/40 text-emerald-500">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-500/60 truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.shortcut && (
                    <span className="text-[10px] text-emerald-600 border border-emerald-950 px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  )}
                  {isSelected && <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-emerald-600 text-xs font-mono">
              No matching commands or destinations found for "{query}".
            </div>
          )}
        </div>

        {/* Terminal Footer Info */}
        <div className="p-2.5 bg-[#030805] border-t border-surface-border flex items-center justify-between text-[10px] text-emerald-600 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          <span>O_RABBIT TERMINAL CLI v1.0.0</span>
        </div>
      </div>
    </div>
  );
};
