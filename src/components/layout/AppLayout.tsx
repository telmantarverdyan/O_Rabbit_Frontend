import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '../common/Toast';
import { CommandPalette } from '../common/CommandPalette';
import { TerminalDrawer } from '../terminal/TerminalDrawer';
import { ShortcutsModal } from '../common/ShortcutsModal';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const navigate = useNavigate();
  const gChordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const gChordActiveRef = useRef<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Terminal Drawer with Ctrl + ` or Ctrl + ~
      if ((e.ctrlKey || e.metaKey) && (e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
        return;
      }

      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
        (e.target as HTMLElement)?.tagName
      );

      // Open Shortcuts Help on '?' if not typing in input
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Handle G-chord vim navigation when outside form inputs
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (gChordActiveRef.current) {
          gChordActiveRef.current = false;
          if (gChordTimeoutRef.current) clearTimeout(gChordTimeoutRef.current);

          const key = e.key.toLowerCase();
          const routeMap: Record<string, string> = {
            o: '/',
            r: '/runs',
            j: '/jobs',
            q: '/query',
            l: '/lineage',
            d: '/datasets',
            w: '/workers',
            s: '/schedules',
            m: '/maintenance',
          };

          if (routeMap[key]) {
            e.preventDefault();
            navigate(routeMap[key]);
            return;
          }
        } else if (e.key.toLowerCase() === 'g') {
          gChordActiveRef.current = true;
          if (gChordTimeoutRef.current) clearTimeout(gChordTimeoutRef.current);
          gChordTimeoutRef.current = setTimeout(() => {
            gChordActiveRef.current = false;
          }, 1500);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (gChordTimeoutRef.current) clearTimeout(gChordTimeoutRef.current);
    };
  }, [navigate]);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background text-emerald-100 font-mono">
        <CommandPalette />
        <TerminalDrawer
          isOpen={isTerminalOpen}
          onClose={() => setIsTerminalOpen(false)}
        />
        <ShortcutsModal
          isOpen={isShortcutsOpen}
          onClose={() => setIsShortcutsOpen(false)}
        />

        <Sidebar
          isMobileOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header
            onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
            onOpenCommandPalette={() => {
              window.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', metaKey: true })
              );
            }}
            onToggleTerminal={() => setIsTerminalOpen((prev) => !prev)}
            onOpenShortcuts={() => setIsShortcutsOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};


