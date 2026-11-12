import React from 'react';
import { Outlet } from 'react-router-dom';
import { ToastProvider } from '../common/Toast';
import { Taskbar } from './Header';
import { DesktopIcons } from './Sidebar';

/** A Win9x desktop: icons on the left, windows in the middle, taskbar at the bottom. */
export const AppLayout: React.FC = () => (
  <ToastProvider>
    <div className="flex h-screen flex-col overflow-hidden bg-desktop text-fg">
      <div className="flex min-h-0 flex-1">
        <DesktopIcons />
        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 sm:px-3">
          <div className="mx-auto max-w-7xl animate-fade-in space-y-3">
            <Outlet />
          </div>
        </main>
      </div>
      <Taskbar />
    </div>
  </ToastProvider>
);
