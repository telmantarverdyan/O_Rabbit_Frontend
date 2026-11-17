import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Check, LogOut, Menu, MonitorPlay, RefreshCw, TerminalSquare } from 'lucide-react';
import { fetchStatus } from '@/api/status';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import rabbitLogoUrl from '@/assets/rabbit/orabbit-pixel.svg';
import { NAV_GROUPS, NAV_ITEMS } from './Sidebar';
import { RunDialog } from './RunDialog';
import { Screensaver, useScreensaverSetting } from './Screensaver';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  return { time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), date: now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) };
}

/** Win9x taskbar: MENU (start) button, the open page, and a tray with master status and a clock. */
export const Taskbar: React.FC = () => {
  const { session, logout } = useAuth();
  const location = useLocation();
  const clock = useClock();
  const [open, setOpen] = useState(false);
  const [runOpen, setRunOpen] = useState(false);
  const [saverOn, setSaverOn] = useScreensaverSetting();
  const [saverPreview, setSaverPreview] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { data: status, error, refetch, isFetching } = useQuery({ queryKey: ['status'], queryFn: () => fetchStatus(), refetchInterval: 10000 });

  const leadership = status?.leadership;
  const healthy = !error && (leadership ? leadership.ready : !!status);
  const current =
    NAV_ITEMS.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to) && i.to !== '/')) ??
    (location.pathname.startsWith('/runs/') ? NAV_ITEMS.find((i) => i.to === '/runs') : NAV_ITEMS[2]);

  // Close the start menu on outside click, Escape, or navigation.
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      startRef.current?.focus(); // back to the MENU button, like Windows
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Keyboard: focus the first item on open; arrows, Home and End move between items.
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>('[role^=menuitem]')?.focus();
  }, [open]);
  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>('[role^=menuitem]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      items[(n + items.length) % items.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
  };

  const CurrentIcon = current?.icon;

  return (
    <footer className="relative z-40 flex h-[40px] flex-shrink-0 items-center gap-1.5 border-t-2 border-white bg-card px-1.5 shadow-[inset_0_1px_#dfdfdf]">
      <div ref={menuRef} className="relative">
        <button
          ref={startRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="menu"
          className={clsx('flex h-[30px] cursor-pointer items-center gap-1.5 bg-card px-2 font-pixel text-sm font-bold uppercase', open ? 'bevel-in' : 'bevel-out')}
        >
          <Menu className="h-4 w-4" aria-hidden /> Menu
        </button>
        {open && (
          <div ref={listRef} role="menu" aria-label="Start menu" onKeyDown={onMenuKeyDown} className="bevel-out absolute bottom-[34px] left-0 flex w-64 bg-card shadow-[3px_3px_0_rgba(0,0,0,0.45)]">
            {/* Vertical banner, like the Windows 95 start menu. */}
            <div className="flex w-7 flex-col items-center justify-end gap-2 bg-gradient-to-t from-title to-title-to pb-2">
              <span className="-rotate-180 font-pixel text-sm font-bold uppercase tracking-widest text-white [writing-mode:vertical-rl]">O_Rabbit</span>
              <img src={rabbitLogoUrl} alt="" className="h-5 w-5 [image-rendering:pixelated]" />
            </div>
            <div className="min-w-0 flex-1 py-1">
              {NAV_GROUPS.map((g, gi) => (
                <div key={g.label} className={clsx(gi > 0 && 'mt-1 border-t border-line pt-1 shadow-[0_1px_0_#fff_inset]')}>
                  {g.items.map(({ to, label, icon: Icon, color, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      role="menuitem"
                      className={({ isActive }) => clsx('flex items-center gap-2.5 px-2 py-1.5 font-pixel text-sm hover:bg-accent hover:text-accent-fg focus:bg-accent focus:text-accent-fg focus:outline-none', isActive && 'font-bold')}
                    >
                      <Icon className={clsx('h-5 w-5', color)} strokeWidth={1.75} />
                      {label}
                    </NavLink>
                  ))}
                </div>
              ))}
              <div className="mt-1 border-t border-line pt-1">
                <button type="button" role="menuitem" onClick={() => { setOpen(false); setRunOpen(true); }} className="flex w-full cursor-pointer items-center gap-2.5 px-2 py-1.5 font-pixel text-sm hover:bg-accent hover:text-accent-fg focus:bg-accent focus:text-accent-fg focus:outline-none">
                  <TerminalSquare className="h-5 w-5" aria-hidden /> Run…
                </button>
                <button type="button" role="menuitemcheckbox" aria-checked={saverOn} onClick={() => setSaverOn(!saverOn)} className="flex w-full cursor-pointer items-center gap-2.5 px-2 py-1.5 font-pixel text-sm hover:bg-accent hover:text-accent-fg focus:bg-accent focus:text-accent-fg focus:outline-none" title="Starts after 3 idle minutes">
                  <span className="flex h-5 w-5 items-center justify-center">{saverOn && <Check className="h-4 w-4" aria-hidden />}</span> Screen saver
                </button>
                <button type="button" role="menuitem" onClick={() => { setOpen(false); setSaverPreview(true); }} className="flex w-full cursor-pointer items-center gap-2.5 px-2 py-1.5 font-pixel text-sm hover:bg-accent hover:text-accent-fg focus:bg-accent focus:text-accent-fg focus:outline-none">
                  <MonitorPlay className="h-5 w-5" aria-hidden /> Test screen saver
                </button>
              </div>
              <div className="mt-1 border-t border-line pt-1">
                <button type="button" role="menuitem" onClick={logout} className="flex w-full cursor-pointer items-center gap-2.5 px-2 py-1.5 font-pixel text-sm hover:bg-accent hover:text-accent-fg focus:bg-accent focus:text-accent-fg focus:outline-none">
                  <LogOut className="h-5 w-5" aria-hidden /> Disconnect…
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <span className="h-[28px] w-px bg-line shadow-[1px_0_#fff]" aria-hidden />

      {current && (
        <div className="bevel-in flex h-[30px] min-w-0 max-w-[14rem] items-center gap-1.5 bg-raised px-2 font-pixel text-sm font-bold uppercase" title="Current window">
          {CurrentIcon && <CurrentIcon className={clsx('h-4 w-4 flex-shrink-0', current.color)} strokeWidth={1.75} />}
          <span className="truncate">{current.label}</span>
        </div>
      )}

      <div className="flex-1" />

      <div className="bevel-thin flex h-[30px] min-w-0 items-center gap-2 px-2 text-xs" title={error ? errorMessage(error) : leadership ? `${leadership.leadership_state} · epoch ${leadership.leadership_epoch}` : 'Master status'}>
        <img src={rabbitLogoUrl} alt="" className="hidden h-5 w-5 flex-shrink-0 [image-rendering:pixelated] sm:block" />
        <span className={clsx('h-2.5 w-2.5 flex-shrink-0 border border-fg', healthy ? 'bg-[#00b000]' : 'bg-danger')} aria-hidden />
        <span className={clsx('font-pixel text-sm font-bold uppercase', !healthy && 'text-danger')}>{error ? 'Offline' : healthy ? 'Ready' : 'Busy'}</span>
        <span className="hidden max-w-[16rem] truncate font-mono text-[11px] text-fg-muted lg:inline">{session?.masterUrl}</span>
        <button type="button" onClick={() => refetch()} aria-label="Refresh master status" className="hidden cursor-pointer text-fg-muted hover:text-fg sm:block">
          <RefreshCw className={clsx('h-3.5 w-3.5', isFetching && 'animate-spin')} aria-hidden />
        </button>
        <span className="whitespace-nowrap font-pixel text-sm tabular-nums" title={clock.date}>{clock.time}</span>
      </div>
      {runOpen && <RunDialog onClose={() => setRunOpen(false)} />}
      <Screensaver enabled={saverOn} preview={saverPreview} onPreviewEnd={() => setSaverPreview(false)} />
    </footer>
  );
};
