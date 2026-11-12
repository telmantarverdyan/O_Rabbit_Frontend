import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { KeyRound, Server, ShieldCheck } from 'lucide-react';
import { RabbitLogo } from '@/components/branding/RabbitLogo';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Progress } from '@/components/common/Progress';
import { Window } from '@/components/common/Window';
import rabbitLogoUrl from '@/assets/rabbit/orabbit-pixel.svg';
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
    <div className="flex min-h-screen items-center justify-center bg-desktop px-4 py-12">
      <div className="w-full max-w-md animate-fade-in shadow-[4px_4px_0_rgba(0,0,0,0.45)]">
        <Window title="Connect to a master" icon={<img src={rabbitLogoUrl} alt="" className="h-4 w-4" />} bodyClassName="p-4" status="O_Rabbit console · tokens are kept only for this tab">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <RabbitLogo size="lg" compact />
              <p className="text-[13px]">Type the master&apos;s HTTP address and API token, then press Connect.</p>
            </div>
            {expired && !error && <p className="bevel-thin bg-canvas px-2 py-1.5 text-[13px] font-bold text-warn">The master rejected the saved token. Log in again.</p>}
            <Input
              label="Master address:"
              icon={Server}
              value={masterAddress}
              onChange={(e) => setMasterAddress(e.target.value)}
              placeholder="http://10.0.0.5:9100"
              helperText="ORABBIT_HTTP_ADDR, port 9100 by default."
              autoComplete="url"
              required
            />
            <Input
              label="API token:"
              icon={KeyRound}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              helperText="ORABBIT_HTTP_AUTH_TOKEN."
              autoComplete="current-password"
              required
            />
            <Input
              label="Remote-operations token (optional):"
              icon={ShieldCheck}
              type="password"
              value={opsToken}
              onChange={(e) => setOpsTokenValue(e.target.value)}
              helperText="ORABBIT_REMOTE_OPS_AUTH_TOKEN. Only needed to create workers; you can add it later."
              autoComplete="off"
            />
            {error && (
              <p role="alert" className="bevel-thin break-words bg-canvas px-2 py-1.5 text-[13px] font-bold text-danger">
                {error}
              </p>
            )}
            {submitting && <Progress label="Connecting" />}
            <div className="flex justify-end gap-2">
              <Button type="submit" loading={submitting} className="min-w-[96px]">Connect</Button>
            </div>
          </form>
        </Window>
      </div>
    </div>
  );
};
