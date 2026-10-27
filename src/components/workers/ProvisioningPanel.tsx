import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Activity, Plus, Rocket, ScrollText, Trash2, Wifi } from 'lucide-react';
import { deleteServer, fetchDeployments, fetchServers, testServerSsh } from '@/api/remoteOps';
import { errorMessage } from '@/api/client';
import { Server } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Panel, QueryState, rowClass, tableClass, tdClass, thClass } from '@/components/common/QueryState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useToast } from '@/components/common/Toast';
import { formatTime, shortId } from '@/utils/format';
import { AddServerModal } from './AddServerModal';
import { DeploymentProgress, DeploymentWatch } from './DeploymentProgress';
import { OpsTokenCallout } from './OpsTokenCallout';

/** Servers that can host workers, and recent worker deployments with their logs. */
export const ProvisioningPanel: React.FC<{ onDeploy: (serverId: string) => void }> = ({ onDeploy }) => {
  const { session } = useAuth();
  const toast = useToast();
  const hasOps = !!session?.opsToken;
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<DeploymentWatch | null>(null);

  const serversQuery = useQuery({ queryKey: ['ops', 'servers'], queryFn: fetchServers, enabled: hasOps });
  const deploymentsQuery = useQuery({
    queryKey: ['ops', 'deployments'],
    queryFn: () => fetchDeployments(),
    enabled: hasOps,
    // Refresh while something is still deploying.
    refetchInterval: (q) => (q.state.data?.some((d) => d.status === 'RUNNING') ? 4000 : false),
  });
  const servers = serversQuery.data ?? [];
  const serverName = (id: string) => servers.find((s) => s.id === id)?.name ?? shortId(id);
  const workerDeployments = (deploymentsQuery.data ?? []).filter((d) => d.component === 'worker').slice(0, 10);

  const test = useMutation({
    mutationFn: (server: Server) => testServerSsh(server.id),
    onSuccess: (res, server) => {
      toast.success(`${res.remote_user}@${res.hostname || server.host} answered in ${res.latency_ms} ms.`, `${server.name}: SSH OK`);
      serversQuery.refetch();
    },
    onError: (err, server) => {
      toast.error(errorMessage(err), `${server.name}: SSH failed`);
      serversQuery.refetch();
    },
  });
  const remove = useMutation({
    mutationFn: (server: Server) => deleteServer(server.id),
    onSuccess: (_, server) => {
      toast.success(`Server ${server.name} removed. Workers already running there keep running.`);
      serversQuery.refetch();
    },
    onError: (err) => toast.error(errorMessage(err), 'Remove failed'),
  });

  if (!hasOps) {
    return (
      <Panel title="Provisioning" description="Create workers on your servers from here">
        <OpsTokenCallout />
      </Panel>
    );
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <Panel
        title="Servers"
        description="Hosts the master can deploy workers to over SSH"
        flush
        actions={<Button variant="secondary" size="sm" icon={Plus} onClick={() => setAdding(true)}>Add server</Button>}
      >
        <QueryState isLoading={serversQuery.isLoading} error={serversQuery.error} onRetry={() => serversQuery.refetch()} isEmpty={!servers.length} emptyMessage="No servers yet. Add one to create workers on it." emptyAction={<Button size="sm" icon={Plus} onClick={() => setAdding(true)}>Add server</Button>}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Server</th>
                <th className={`${thClass} hidden w-40 sm:table-cell`}>Last check</th>
                <th className={`${thClass} w-36 text-right`}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {servers.map((s) => (
                <tr key={s.id} className={rowClass}>
                  <td className={tdClass}>
                    <p className="truncate text-fg">{s.name}</p>
                    <p className="truncate font-mono text-xs text-fg-subtle">{s.ssh_user}@{s.host}:{s.ssh_port}</p>
                    {s.last_error && <p className="mt-0.5 line-clamp-2 break-words text-xs text-danger">{s.last_error}</p>}
                  </td>
                  <td className={`${tdClass} hidden text-xs text-fg-muted sm:table-cell`}>{s.last_seen_at ? formatTime(s.last_seen_at) : 'never'}</td>
                  <td className={`${tdClass} space-x-1 text-right`}>
                    <Button variant="ghost" size="sm" icon={Wifi} aria-label={`Test SSH to ${s.name}`} title="Test SSH" loading={test.isPending && test.variables?.id === s.id} onClick={() => test.mutate(s)}>{''}</Button>
                    <Button variant="ghost" size="sm" icon={Trash2} aria-label={`Remove ${s.name}`} title="Remove server" onClick={() => window.confirm(`Remove server ${s.name}? Running workers are not stopped.`) && remove.mutate(s)}>{''}</Button>
                    <Button size="sm" icon={Rocket} aria-label={`Create workers on ${s.name}`} title="Create workers here" onClick={() => onDeploy(s.id)}>{''}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueryState>
      </Panel>

      <Panel title="Recent worker deployments" description="Latest 10" flush>
        <QueryState isLoading={deploymentsQuery.isLoading} error={deploymentsQuery.error} onRetry={() => deploymentsQuery.refetch()} isEmpty={!workerDeployments.length} emptyMessage="No worker deployments yet.">
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={`${thClass} w-32`}>Status</th>
                <th className={thClass}>Server</th>
                <th className={`${thClass} hidden w-44 md:table-cell`}>Started</th>
                <th className={`${thClass} w-16`}><span className="sr-only">Log</span></th>
              </tr>
            </thead>
            <tbody>
              {workerDeployments.map((d) => (
                <tr key={d.id} className={rowClass}>
                  <td className={tdClass}><StatusBadge status={d.status} size="sm" /></td>
                  <td className={`${tdClass} truncate`}>
                    {serverName(d.server_id)}
                    {d.error && <p className="line-clamp-1 break-words text-xs text-danger" title={d.error}>{d.error}</p>}
                  </td>
                  <td className={`${tdClass} hidden text-xs text-fg-muted md:table-cell`}>{formatTime(d.started_at)}</td>
                  <td className={`${tdClass} text-right`}>
                    <Button variant="ghost" size="sm" icon={d.status === 'RUNNING' ? Activity : ScrollText} aria-label="Show deployment log" title="Show log" onClick={() => setViewing({ deployment: d })}>{''}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </QueryState>
      </Panel>

      {adding && <AddServerModal onClose={() => setAdding(false)} />}
      {viewing && (
        <Modal isOpen onClose={() => setViewing(null)} title="Worker deployment" subtitle={`${serverName(viewing.deployment.server_id)} · ${formatTime(viewing.deployment.started_at)}`} maxWidth="2xl">
          <DeploymentProgress watch={viewing} />
        </Modal>
      )}
    </div>
  );
};
