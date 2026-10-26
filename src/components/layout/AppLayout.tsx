import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '../common/Toast';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-canvas text-fg">
        <Sidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
          <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
};
