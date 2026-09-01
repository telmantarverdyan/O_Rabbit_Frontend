import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Lazy-loaded route components
const Overview = lazy(() => import('./pages/Overview').then((m) => ({ default: m.Overview })));
const Runs = lazy(() => import('./pages/Runs').then((m) => ({ default: m.Runs })));
const RunDetail = lazy(() => import('./pages/RunDetail').then((m) => ({ default: m.RunDetail })));
const Jobs = lazy(() => import('./pages/Jobs').then((m) => ({ default: m.Jobs })));
const Connections = lazy(() => import('./pages/Connections').then((m) => ({ default: m.Connections })));
const Workers = lazy(() => import('./pages/Workers').then((m) => ({ default: m.Workers })));
const Datasets = lazy(() => import('./pages/Datasets').then((m) => ({ default: m.Datasets })));
const QueryConsole = lazy(() => import('./pages/QueryConsole').then((m) => ({ default: m.QueryConsole })));
const Lineage = lazy(() => import('./pages/Lineage').then((m) => ({ default: m.Lineage })));
const Schedules = lazy(() => import('./pages/Schedules').then((m) => ({ default: m.Schedules })));
const Maintenance = lazy(() => import('./pages/Maintenance').then((m) => ({ default: m.Maintenance })));
const Alerts = lazy(() => import('./pages/Alerts').then((m) => ({ default: m.Alerts })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

const PageFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[300px] text-slate-500 font-mono text-xs">
    <div className="flex items-center gap-2">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      <span>Loading view...</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 2000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Overview />} />
                <Route path="/runs" element={<Runs />} />
                <Route path="/runs/:id" element={<RunDetail />} />
                <Route path="/jobs" element={<Jobs />} />
                <Route path="/schedules" element={<Schedules />} />
                <Route path="/lineage" element={<Lineage />} />
                <Route path="/connections" element={<Connections />} />
                <Route path="/workers" element={<Workers />} />
                <Route path="/datasets" element={<Datasets />} />
                <Route path="/query" element={<QueryConsole />} />
                <Route path="/maintenance" element={<Maintenance />} />
                <Route path="/alerts" element={<Alerts />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

