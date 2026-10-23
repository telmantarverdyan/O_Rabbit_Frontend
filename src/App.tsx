import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ApiError } from './api/client';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Login } from './pages/Login';

// Lazy-loaded route components
const Overview = lazy(() => import('./pages/Overview').then((m) => ({ default: m.Overview })));
const Runs = lazy(() => import('./pages/Runs').then((m) => ({ default: m.Runs })));
const NewRun = lazy(() => import('./pages/NewRun').then((m) => ({ default: m.NewRun })));
const RunDetail = lazy(() => import('./pages/RunDetail').then((m) => ({ default: m.RunDetail })));
const Jobs = lazy(() => import('./pages/Jobs').then((m) => ({ default: m.Jobs })));
const Connections = lazy(() => import('./pages/Connections').then((m) => ({ default: m.Connections })));
const Workers = lazy(() => import('./pages/Workers').then((m) => ({ default: m.Workers })));

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
      // Retrying a 4xx (bad token, missing run) only delays the error message.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
    },
  },
});

/** Sends users without a session to /login, remembering where they were going. */
const RequireSession: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  element={
                    <RequireSession>
                      <AppLayout />
                    </RequireSession>
                  }
                >
                  <Route path="/" element={<Overview />} />
                  <Route path="/runs" element={<Runs />} />
                  <Route path="/runs/new" element={<NewRun />} />
                  <Route path="/runs/:id" element={<RunDetail />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/connections" element={<Connections />} />
                  <Route path="/workers" element={<Workers />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};
