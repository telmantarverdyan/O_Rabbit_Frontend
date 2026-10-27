import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Activity, Ban, Clock, KeyRound, ListChecks, Plus, PowerOff, RefreshCw } from 'lucide-react';
import { fetchWorkerIdentities, fetchWorkers, revokeWorkerIdentity } from '@/api/workers';
import { errorMessage } from '@/api/client';
import { Worker } from '@/api/types';
import { Button } from '@/components/common/Button';
import { MetricCard } from '@/components/common/MetricCard';
import { Pagination } from '@/components/common/Pagination';
import { PageTitle, Panel, QueryState, rowClass, tableClass, tdClass, thClass } from '@/components/common/QueryState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/common/Toast';
import { CreateWorkerModal } from '@/components/workers/CreateWorkerModal';
import { EnrollmentModal } from '@/components/workers/EnrollmentModal';
import { ProvisioningPanel } from '@/components/workers/ProvisioningPanel';
import { usePagination } from '@/hooks/usePagination';
import { formatTime } from '@/utils/format';
import { workerConnection, WorkerConnection, workerGroupName, workerResources } from '@/utils/workers';

const CONNECTION_LABEL: Record<WorkerConnection, string> = { ACTIVE: 'Active', INACTIVE: 'Inactive', OFFLINE: 'Offline' };
// Map onto StatusBadge tones: active → success, inactive → pending, offline → neutral.
const CONNECTION_BADGE: Record<WorkerConnection, string> = { ACTIVE: 'ACTIVE', INACTIVE: 'PENDING', OFFLINE: 'CANCELED' };
const FILTERS: Array<'' | WorkerConnection> = ['', 'ACTIVE', 'INACTIVE', 'OFFLINE'];

export const Workers: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [createFor, setCreateFor] = useState<string | null>(null);
  const [filter, setFilter] = useState<'' | WorkerConnection>('');

  // All known workers; the connection state is derived from each heartbeat.
  const workersQuery = useQuery({ queryKey: ['workers', true], queryFn: () => fetchWorkers(true), refetchInterval: 10000 });
  const identitiesQuery = useQuery({ queryKey: ['worker-identities'], queryFn: fetchWorkerIdentities });

  const workers = useMemo(() => (workersQuery.data ?? []).map((w) => ({ ...w, connection: workerConnection(w) })), [workersQuery.data]);
  const counts = useMemo(() => {
    const c: Record<WorkerConnection, number> = { ACTIVE: 0, INACTIVE: 0, OFFLINE: 0 };
    for (const w of workers) c[w.connection]++;
    return c;
  }, [workers]);
  const runningTasks = workers.reduce((n, w) => n + (w.running_tasks ?? 0), 0);
  const filtered = useMemo(() => (filter ? workers.filter((w) => w.connection === filter) : workers), [workers, filter]);
  const pagination = usePagination(filtered);

  const revoke = useMutation({
    mutationFn: (id: string) => revokeWorkerIdentity(id),
    onSuccess: () => {
      toast.success('Identity revoked. That worker can no longer connect.');
      queryClient.invalidateQueries({ queryKey: ['worker-identities'] });
    },
    onError: (err) => toast.error(errorMessage(err), 'Revoke failed'),
  });

  const identities = identitiesQuery.data ?? [];
  const tile = (n: number) => (workersQuery.isLoading ? '…' : n);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Workers"
        subtitle="Worker processes that pull tasks from this master. Create them on your servers, or enroll ones you start yourself."
        actions={
          <>
            <Button variant="secondary" icon={KeyRound} onClick={() => setEnrollOpen(true)}>Enrollment token</Button>
            <Button icon={Plus} onClick={() => setCreateFor('')}>Create worker</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Active" value={tile(counts.ACTIVE)} subtitle="heartbeat < 30 s" icon={Activity} />
        <MetricCard title="Inactive" value={tile(counts.INACTIVE)} subtitle="silent < 5 min" icon={Clock} color={counts.INACTIVE ? 'amber' : 'emerald'} />
        <MetricCard title="Offline" value={tile(counts.OFFLINE)} subtitle="silent longer" icon={PowerOff} color="slate" />
        <MetricCard title="Running tasks" value={tile(runningTasks)} subtitle="across all workers" icon={ListChecks} />
      </div>

      <Panel
        title="Workers"
        description={`${workers.length.toLocaleString()} known`}
        flush
        actions={<Button variant="ghost" size="sm" icon={RefreshCw} loading={workersQuery.isFetching} onClick={() => workersQuery.refetch()} aria-label="Refresh workers">{''}</Button>}
      >
        <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3" role="radiogroup" aria-label="Filter by connection">
          {FILTERS.map((f) => (
            <button
              key={f || 'all'}
              type="button"
              role="radio"
              aria-checked={filter === f}
              onClick={() => {
                setFilter(f);
                pagination.setPage(1);
              }}
              className={clsx(
                'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs transition-colors',
                filter === f ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-fg-muted hover:border-fg-subtle hover:text-fg'
              )}
            >
              {f ? CONNECTION_LABEL[f] : 'All'}
              <span className="tabular-nums text-fg-subtle">{f ? counts[f] : workers.length}</span>
            </button>
          ))}
        </div>
        <QueryState
          isLoading={workersQuery.isLoading}
          error={workersQuery.error}
          onRetry={() => workersQuery.refetch()}
          isEmpty={!filtered.length}
          emptyMessage={filter ? `No ${CONNECTION_LABEL[filter].toLowerCase()} workers.` : 'No workers have connected to this master yet.'}
          emptyAction={!filter ? <Button size="sm" icon={Plus} onClick={() => setCreateFor('')}>Create worker</Button> : undefined}
        >
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Worker</th>
                <th className={`${thClass} w-32`}>Status</th>
                <th className={`${thClass} w-20 text-right`}>Tasks</th>
                <th className={`${thClass} hidden md:table-cell`}>Resources</th>
                <th className={`${thClass} hidden w-44 lg:table-cell`}>Last heartbeat</th>
              </tr>
            </thead>
            <tbody>
              {pagination.items.map((w) => (
                <WorkerRow key={w.id} worker={w} connection={w.connection} />
              ))}
            </tbody>
          </table>
          <Pagination state={pagination} noun="workers" />
        </QueryState>
      </Panel>

      <ProvisioningPanel onDeploy={(serverId) => setCreateFor(serverId)} />

      <Panel title="Enrolled identities" description={`${identities.length} master-issued certificates`} flush actions={<Button variant="ghost" size="sm" icon={RefreshCw} onClick={() => identitiesQuery.refetch()} aria-label="Refresh identities">{''}</Button>}>
        <QueryState isLoading={identitiesQuery.isLoading} error={identitiesQuery.error} isEmpty={!identities.length} emptyMessage="No master-issued worker identities.">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={`${thClass} hidden md:table-cell`}>Host</th>
                <th className={`${thClass} hidden w-28 lg:table-cell`}>Pool</th>
                <th className={`${thClass} w-32`}>Status</th>
                <th className={`${thClass} hidden w-48 sm:table-cell`}>Certificate expires</th>
                <th className={`${thClass} w-28`}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {identities.map((i) => (
                <tr key={i.id} className={rowClass}>
                  <td className={tdClass}>{i.name}<div className="truncate font-mono text-xs text-fg-subtle">{i.id}</div></td>
                  <td className={`${tdClass} hidden truncate md:table-cell`}>{i.hostname}</td>
                  <td className={`${tdClass} hidden lg:table-cell`}>{i.pool || '—'}</td>
                  <td className={tdClass}><StatusBadge status={i.revoked_at ? 'REVOKED' : i.status} size="sm" /></td>
                  <td className={`${tdClass} hidden text-fg-muted sm:table-cell`}>{formatTime(i.cert_not_after)}</td>
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
        </QueryState>
      </Panel>

      {enrollOpen && <EnrollmentModal onClose={() => setEnrollOpen(false)} />}
      {createFor !== null && <CreateWorkerModal initialServerId={createFor} currentWorkers={workersQuery.data ?? []} onClose={() => setCreateFor(null)} />}
    </div>
  );
};

const WorkerRow: React.FC<{ worker: Worker; connection: WorkerConnection }> = ({ worker: w, connection }) => {
  const group = workerGroupName(w.id);
  const version = w.instances?.[0]?.version;
  const resources = workerResources(w);
  return (
    <tr className={rowClass}>
      <td className={tdClass}>
        {group && <p className="truncate text-fg">{group}</p>}
        <p className={clsx('truncate font-mono text-xs', group ? 'text-fg-subtle' : 'text-fg')} title={w.id}>{w.id}</p>
        {w.addr && w.addr !== w.id && <p className="truncate font-mono text-xs text-fg-subtle md:hidden">{w.addr}</p>}
      </td>
      <td className={tdClass}>
        <StatusBadge status={CONNECTION_BADGE[connection]} label={CONNECTION_LABEL[connection]} size="sm" />
      </td>
      <td className={`${tdClass} text-right tabular-nums`}>{w.running_tasks ?? '—'}</td>
      <td className={`${tdClass} hidden md:table-cell`}>
        <p className="truncate text-xs text-fg">{resources || <span className="text-fg-subtle">not reported</span>}</p>
        <p className="truncate font-mono text-xs text-fg-subtle">{[w.addr, version && `v${version}`].filter(Boolean).join(' · ')}</p>
      </td>
      <td className={`${tdClass} hidden text-xs text-fg-muted lg:table-cell`}>{formatTime(w.last_heartbeat)}</td>
    </tr>
  );
};
