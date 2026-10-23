import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Copy, KeyRound, RefreshCw } from 'lucide-react';
import { createEnrollmentToken, fetchWorkerIdentities, fetchWorkers, revokeWorkerIdentity } from '@/api/workers';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Checkbox, PageTitle, Panel, QueryState, tableClass, tdClass, thClass } from '@/components/common/QueryState';
import { useToast } from '@/components/common/Toast';
import { formatTime } from '@/utils/format';

export const Workers: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showAll, setShowAll] = useState(true);
  const [enrollOpen, setEnrollOpen] = useState(false);

  const workersQuery = useQuery({ queryKey: ['workers', showAll], queryFn: () => fetchWorkers(showAll), refetchInterval: 10000 });
  const identitiesQuery = useQuery({ queryKey: ['worker-identities'], queryFn: fetchWorkerIdentities });

  const revoke = useMutation({
    mutationFn: (id: string) => revokeWorkerIdentity(id),
    onSuccess: () => {
      toast.success('Identity revoked. That worker can no longer connect.');
      queryClient.invalidateQueries({ queryKey: ['worker-identities'] });
    },
    onError: (err) => toast.error(errorMessage(err), 'Revoke failed'),
  });

  const workers = workersQuery.data ?? [];
  const identities = identitiesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Workers"
        subtitle="Worker processes that pull tasks from this master over gRPC."
        actions={<Button variant="cyber" icon={KeyRound} onClick={() => setEnrollOpen(true)}>Enrollment token</Button>}
      />

      <Panel
        title={`${workers.length} workers`}
        actions={
          <>
            <Checkbox label="Include inactive" checked={showAll} onChange={setShowAll} />
            <Button variant="ghost" size="sm" icon={RefreshCw} loading={workersQuery.isFetching} onClick={() => workersQuery.refetch()}>Refresh</Button>
          </>
        }
      >
        <QueryState isLoading={workersQuery.isLoading} error={workersQuery.error} onRetry={() => workersQuery.refetch()} isEmpty={!workers.length} emptyMessage="No workers have connected to this master.">
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Worker</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Address</th>
                  <th className={thClass}>Last heartbeat</th>
                  <th className={thClass}>Instances</th>
                </tr>
              </thead>
              <tbody>
                {workers.map((w) => (
                  <tr key={w.id}>
                    <td className={tdClass}>{w.id}</td>
                    <td className={tdClass}><StatusBadge status={w.status} size="sm" /></td>
                    <td className={tdClass}>{w.addr || '—'}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatTime(w.last_heartbeat)}</td>
                    <td className={tdClass}>{w.instances?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Panel>

      <Panel title={`Enrolled identities (${identities.length})`} actions={<Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => identitiesQuery.refetch()}>Refresh</Button>}>
        <QueryState isLoading={identitiesQuery.isLoading} error={identitiesQuery.error} isEmpty={!identities.length} emptyMessage="No master-issued worker identities.">
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Host</th>
                  <th className={thClass}>Pool</th>
                  <th className={thClass}>Status</th>
                  <th className={thClass}>Certificate expires</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {identities.map((i) => (
                  <tr key={i.id}>
                    <td className={tdClass}>{i.name}<div className="text-[10px] text-emerald-600">{i.id}</div></td>
                    <td className={tdClass}>{i.hostname}</td>
                    <td className={tdClass}>{i.pool || '—'}</td>
                    <td className={tdClass}><StatusBadge status={i.revoked_at ? 'REVOKED' : i.status} size="sm" /></td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatTime(i.cert_not_after)}</td>
                    <td className={`${tdClass} text-right`}>
                      {!i.revoked_at && (
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Ban}
                          loading={revoke.isPending && revoke.variables === i.id}
                          onClick={() => {
                            if (window.confirm(`Revoke ${i.name}? The worker is disconnected immediately.`)) revoke.mutate(i.id);
                          }}
                        >
                          Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </QueryState>
      </Panel>

      {enrollOpen && <EnrollmentModal onClose={() => setEnrollOpen(false)} />}
    </div>
  );
};

const EnrollmentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
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
    <Modal isOpen onClose={onClose} title="Create worker enrollment token" subtitle="A new worker uses it once to get its certificate.">
      {token ? (
        <div className="space-y-3">
          <p className="text-xs text-amber-300">Copy it now. The master stores only a hash and cannot show it again.</p>
          <pre className="break-all rounded-lg border border-surface-border bg-terminal-dark p-3 text-xs text-emerald-200">{token}</pre>
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
          {mutation.error && <p role="alert" className="text-xs text-rose-300 break-words">{errorMessage(mutation.error)}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" icon={KeyRound} loading={mutation.isPending}>Create</Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
