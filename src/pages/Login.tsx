import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { KeyRound, Server, ShieldCheck } from 'lucide-react';
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
  const [opsToken, setOpsTokenValue] = useState('');
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
      await login(masterAddress, token, opsToken);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <RabbitLogo size="xl" compact />
          <h1 className="cursor-block mt-4 text-xl font-bold text-fg glow"><span className="mr-2 text-accent" aria-hidden>&gt;</span>Connect to a master</h1>
          <p className="mt-1 text-sm text-fg-muted">Use the master&apos;s HTTP address and API token.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-md border border-line bg-card/90 p-6 glow-box">
          {expired && !error && (
            <p className="rounded-md border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">The master rejected the saved token. Log in again.</p>
          )}
          <Input
            label="Master address"
            icon={Server}
            value={masterAddress}
            onChange={(e) => setMasterAddress(e.target.value)}
            placeholder="http://10.0.0.5:9100"
            helperText="ORABBIT_HTTP_ADDR, port 9100 by default."
            autoComplete="url"
            required
          />
          <Input
            label="API token"
            icon={KeyRound}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            helperText="ORABBIT_HTTP_AUTH_TOKEN. Kept only for this tab."
            autoComplete="current-password"
            required
          />
          <Input
            label="Remote-operations token (optional)"
            icon={ShieldCheck}
            type="password"
            value={opsToken}
            onChange={(e) => setOpsTokenValue(e.target.value)}
            helperText="ORABBIT_REMOTE_OPS_AUTH_TOKEN. Needed only to create workers on your servers; you can add it later."
            autoComplete="off"
          />
          {error && (
            <p role="alert" className="break-words rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" loading={submitting} className="w-full">
            Connect
          </Button>
        </form>
      </div>
    </div>
  );
};
