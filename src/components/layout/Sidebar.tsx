import React from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { Briefcase, Database, FileUp, ListOrdered, LucideIcon, Monitor, Play, ScrollText, Server } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Icon colors, drawn like the chunky Win9x desktop icons. */
  color: string;
  end?: boolean;
}

export const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Run',
    items: [
      { to: '/runs/new', label: 'New run', icon: Play, color: 'text-[#005a00] fill-[#3ec43e]' },
      { to: '/runs/file', label: 'Run from file', icon: FileUp, color: 'text-[#5c4500] fill-[#ffd84d]' },
    ],
  },
  {
    label: 'Monitor',
    items: [
      { to: '/', label: 'Overview', icon: Monitor, color: 'text-[#202020] fill-[#4a8fd8]', end: true },
      { to: '/runs', label: 'Runs', icon: ListOrdered, color: 'text-[#000080] fill-white', end: true },
      { to: '/logs', label: 'Logs', icon: ScrollText, color: 'text-[#202020] fill-white' },
    ],
  },
  {
    label: 'Configure',
    items: [
      { to: '/jobs', label: 'Jobs', icon: Briefcase, color: 'text-[#4a2a00] fill-[#c8873c]' },
      { to: '/connections', label: 'Connections', icon: Database, color: 'text-[#202020] fill-[#c0c0c0]' },
      { to: '/workers', label: 'Workers', icon: Server, color: 'text-[#202020] fill-[#9a9a9a]' },
    ],
  },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

/** Desktop icons down the left edge (md and up). The current page looks "selected". */
export const DesktopIcons: React.FC = () => (
  <nav aria-label="Main navigation" className="hidden w-[92px] flex-shrink-0 flex-col items-center gap-3 overflow-y-auto py-4 md:flex">
    {NAV_ITEMS.map(({ to, label, icon: Icon, color, end }) => (
      <NavLink key={to} to={to} end={end} className="group flex w-[84px] flex-col items-center gap-1 focus:outline-none">
        {({ isActive }) => (
          <>
            <Icon className={clsx('h-9 w-9 drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)]', color, isActive && 'opacity-80')} strokeWidth={1.75} />
            <span
              className={clsx(
                'px-1 text-center font-pixel text-xs uppercase leading-tight',
                isActive ? 'bg-accent text-accent-fg outline-dotted outline-1 outline-white' : 'desktop-text group-focus-visible:bg-accent'
              )}
            >
              {label}
            </span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
);
