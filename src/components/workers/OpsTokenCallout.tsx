import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { errorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { useToast } from '@/components/common/Toast';

/** Shown where provisioning needs the remote-operations token and none is set. */
export const OpsTokenCallout: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { setOpsToken } = useAuth();
  const toast = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await setOpsToken(value);
      toast.success('Worker provisioning is enabled for this tab.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      {!compact && (
        <p className="text-sm text-fg-muted">
          Creating workers runs commands on your servers over SSH, so the master protects it with a separate token,{' '}
          <code className="rounded bg-raised px-1 text-xs">ORABBIT_REMOTE_OPS_AUTH_TOKEN</code>. It is kept only for this tab.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input label="Remote-operations token" icon={ShieldCheck} type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" required error={error || undefined} />
        </div>
        <Button type="submit" loading={saving} disabled={!value.trim()}>Enable</Button>
      </div>
    </form>
  );
};
