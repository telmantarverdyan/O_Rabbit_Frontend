import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { KeyRound, LogIn, Server } from 'lucide-react';
import { RabbitLogo } from '@/components/branding/RabbitLogo';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useAuth } from '@/auth/AuthContext';
import { errorMessage, getLastMasterUrl } from '@/api/client';

const DEFAULT_MASTER = (import.meta.env.VITE_ORABBIT_BACKEND_URL as string | undefined) || 'http://127.0.0.1:9100';

export const Login: React.FC = () => {
  const { session, expired, login } = useAuth();
  const location = useLocation();
  const [masterAddress, setMasterAddress] = useState(() => getLastMasterUrl() || DEFAULT_MASTER);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    const from = (location.state as { from?: string } | null)?.from || '/';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(masterAddress, token);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 font-mono">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-5 rounded-xl border border-surface-border bg-surface/90 p-6 shadow-terminal-md"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <RabbitLogo size="lg" />
          <h1 className="text-lg font-bold text-emerald-100">Connect to an O_Rabbit master</h1>
          <p className="text-xs text-emerald-400/60">
            Enter the master&apos;s HTTP address and its API token.
          </p>
        </div>

        {expired && !error && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-300">
            The master rejected the saved token. Log in again.
          </p>
        )}

        <Input
          label="Master address"
          prefixSymbol="@"
          value={masterAddress}
          onChange={(e) => setMasterAddress(e.target.value)}
          placeholder="http://10.0.0.5:9100"
          helperText="ORABBIT_HTTP_ADDR of the master (default port 9100)."
          autoComplete="url"
          required
        />
        <Input
          label="API token"
          prefixSymbol="#"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          helperText="The ORABBIT_HTTP_AUTH_TOKEN value. Kept only for this browser tab."
          autoComplete="current-password"
          required
        />

        {error && (
          <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 break-words">
            {error}
          </p>
        )}

        <Button type="submit" variant="cyber" size="lg" icon={LogIn} loading={submitting} className="w-full">
          Connect
        </Button>

        <div className="flex items-center justify-center gap-4 text-[10px] text-emerald-600">
          <span className="flex items-center gap-1"><Server className="h-3 w-3" /> /status check</span>
          <span className="flex items-center gap-1"><KeyRound className="h-3 w-3" /> Bearer auth</span>
        </div>
      </form>
    </div>
  );
};
