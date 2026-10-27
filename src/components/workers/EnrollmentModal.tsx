import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Copy, KeyRound } from 'lucide-react';
import { createEnrollmentToken } from '@/api/workers';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { useToast } from '@/components/common/Toast';

/** Creates a one-time token for a worker started outside the UI (registration, not provisioning). */
export const EnrollmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const toast = useToast();
  const [pool, setPool] = useState('');
  const [ttlMinutes, setTtlMinutes] = useState('60');
  const [maxUses, setMaxUses] = useState('1');
  const mutation = useMutation({
    mutationFn: () =>
      createEnrollmentToken({
        pool: pool.trim() || undefined,
        ttl_seconds: Math.round(Number(ttlMinutes) * 60) || undefined,
        max_uses: Number(maxUses) || undefined,
      }),
  });
  const token = mutation.data?.token;

  return (
    <Modal isOpen onClose={onClose} title="Create worker enrollment token" subtitle="For a worker you start yourself: it uses the token once to get its certificate.">
      {token ? (
        <div className="space-y-3">
          <p className="text-sm text-warn">Copy it now. The master stores only a hash and cannot show it again.</p>
          <pre className="whitespace-pre-wrap break-all rounded-md border border-line bg-canvas p-3 font-mono text-xs text-fg">{token}</pre>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              icon={Copy}
              onClick={() => navigator.clipboard.writeText(token).then(() => toast.success('Copied.'), (err) => toast.error(String(err), 'Copy failed'))}
            >
              Copy
            </Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <Input label="Pool" value={pool} onChange={(e) => setPool(e.target.value)} helperText="Optional. Runs with this worker_pool go only to these workers." />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Valid for (minutes)" type="number" min={1} value={ttlMinutes} onChange={(e) => setTtlMinutes(e.target.value)} />
            <Input label="Max uses" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          {mutation.error && <p role="alert" className="break-words text-sm text-danger">{errorMessage(mutation.error)}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" icon={KeyRound} loading={mutation.isPending}>Create</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
