import React, { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useDeploymentStream } from '@/api/opsStream';
import { fetchWorkers } from '@/api/workers';
import { Deployment } from '@/api/types';
import { useToast } from '@/components/common/Toast';
import { workerConnection, workerGroupName } from '@/utils/workers';

export interface DeploymentWatch {
  deployment: Deployment;
  /** How many workers the deployment starts. */
  expected?: number;
  /** Deployment name; its workers have IDs <name>-<container id>. */
  name?: string;
  /** Worker IDs that existed before the deployment, to spot new unnamed workers. */
  knownIds?: string[];
}

/**
 * Live deploy log, then registration tracking: a deployment only starts containers,
 * the workers count as created once they register with the master.
 */
export const DeploymentProgress: React.FC<{ watch: DeploymentWatch }> = ({ watch }) => {
  const { deployment, expected, name, knownIds } = watch;
  const stream = useDeploymentStream(deployment.id);
  const queryClient = useQueryClient();
  const toast = useToast();
  const logRef = useRef<HTMLDivElement>(null);
  const announced = useRef(false);

  const succeeded = stream.finalStatus === 'SUCCEEDED';
  const failed = !!stream.finalStatus && !succeeded;

  // Poll quickly while waiting for the new workers to register.
  const workersQuery = useQuery({ queryKey: ['workers', true], queryFn: () => fetchWorkers(true), refetchInterval: succeeded ? 3000 : 10000 });
  const known = new Set(knownIds ?? []);
  const registered = (workersQuery.data ?? []).filter(
    (w) => workerConnection(w) === 'ACTIVE' && (name ? workerGroupName(w.id) === name : !known.has(w.id))
  ).length;
  const allRegistered = succeeded && expected !== undefined && registered >= expected;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [stream.events.length]);

  useEffect(() => {
    if (!stream.finalStatus || announced.current) return;
    announced.current = true;
    // Only announce a deployment we watched finish, not an old one opened from the list.
    if (deployment.status !== 'RUNNING') return;
    queryClient.invalidateQueries({ queryKey: ['ops', 'deployments'] });
    queryClient.invalidateQueries({ queryKey: ['workers'] });
    if (succeeded) toast.success('The worker containers are running. They appear in the list as they register.', 'Deployment finished');
    else toast.error(`Deployment ended with status ${stream.finalStatus}. See the log for the cause.`, 'Deployment failed');
  }, [stream.finalStatus, succeeded, deployment.status, queryClient, toast]);

  const lines = stream.events
    .map((e) => ({ seq: e.sequence, text: e.data?.line ?? (e.type.endsWith('.started') ? '▶ deployment started' : e.type.endsWith('.completed') ? `■ finished: ${e.data?.status}${e.data?.error ? ` (${e.data.error})` : ''}` : ''), err: e.type.endsWith('.stderr') }))
    .filter((l) => l.text);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm" role="status" aria-live="polite">
        {failed ? (
          <><XCircle className="h-4 w-4 text-danger" aria-hidden /><span className="text-danger">Deployment failed ({stream.finalStatus})</span></>
        ) : allRegistered ? (
          <><CheckCircle2 className="h-4 w-4 text-accent" aria-hidden /><span className="text-accent">All {expected} worker{expected === 1 ? '' : 's'} registered and active</span></>
        ) : succeeded && expected === undefined ? (
          <><CheckCircle2 className="h-4 w-4 text-accent" aria-hidden /><span className="text-accent">Deployment succeeded</span></>
        ) : succeeded ? (
          <><Loader2 className="h-4 w-4 animate-spin text-info" aria-hidden /><span className="text-fg">Containers started · waiting for workers to register{expected !== undefined ? ` (${registered} of ${expected})` : ''}</span></>
        ) : (
          <><Loader2 className="h-4 w-4 animate-spin text-info" aria-hidden /><span className="text-fg">Deploying on the server…</span></>
        )}
      </div>
      {stream.error && <p role="alert" className="text-xs text-warn">Lost the live log: {stream.error}. The deployment keeps running; reopen it from the deployments list.</p>}
      <div ref={logRef} className="h-72 overflow-y-auto overflow-x-hidden rounded-md border border-line bg-canvas p-3 font-mono text-xs leading-relaxed" role="log" aria-label="Deployment log">
        {lines.length ? (
          lines.map((l) => (
            <p key={l.seq} className={`whitespace-pre-wrap break-words ${l.err ? 'text-warn' : 'text-fg'}`}>{l.text}</p>
          ))
        ) : (
          <p className="text-fg-subtle">Waiting for output…</p>
        )}
      </div>
    </div>
  );
};
