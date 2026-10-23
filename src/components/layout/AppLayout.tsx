import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastProvider } from '../common/Toast';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-background text-emerald-100 font-mono">
        <Sidebar isMobileOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)} />
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
