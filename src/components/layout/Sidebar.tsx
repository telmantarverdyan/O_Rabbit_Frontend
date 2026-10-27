import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { Briefcase, Database, FileUp, LayoutDashboard, ListOrdered, Play, ScrollText, Server, X } from 'lucide-react';
import { RabbitLogo } from '@/components/branding/RabbitLogo';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Run',
    items: [
      { to: '/runs/new', label: 'New run', icon: Play },
      { to: '/runs/file', label: 'Run from file', icon: FileUp },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/runs', label: 'Runs', icon: ListOrdered, end: true },
      { to: '/logs', label: 'Logs', icon: ScrollText },
    ],
  },
  {
    label: 'Configure',
    items: [
      { to: '/jobs', label: 'Jobs', icon: Briefcase },
      { to: '/connections', label: 'Connections', icon: Database },
      { to: '/workers', label: 'Workers', icon: Server },
    ],
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onClose }) => (
  <>
    {isMobileOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} aria-hidden />}
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex w-60 flex-shrink-0 flex-col border-r border-line bg-card transition-transform duration-200 md:static md:translate-x-0',
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}
      aria-label="Main navigation"
    >
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        <RabbitLogo size="sm" />
        <button onClick={onClose} className="cursor-pointer rounded-md p-1.5 text-fg-subtle hover:bg-raised hover:text-fg md:hidden" aria-label="Close navigation">
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={() => onClose?.()}
                    className={({ isActive }) =>
                      clsx(
                        'group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors',
                        isActive ? 'bg-accent/10 font-semibold text-accent glow ring-1 ring-inset ring-accent/40' : 'text-fg-muted hover:bg-raised/60 hover:text-fg'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={clsx('h-4 w-4', isActive ? 'text-accent' : 'text-fg-subtle group-hover:text-fg-muted')} aria-hidden />
                        {label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  </>
);
