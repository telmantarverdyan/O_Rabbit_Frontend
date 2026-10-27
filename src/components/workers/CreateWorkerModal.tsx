import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Rocket } from 'lucide-react';
import { deployWorkers, fetchServers } from '@/api/remoteOps';
import { ApiError, errorMessage } from '@/api/client';
import { Worker } from '@/api/types';
import { useAuth } from '@/auth/AuthContext';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { QueryState, Segmented } from '@/components/common/QueryState';
import { MAX_WORKER_SCALE, validateWorkerForm, WorkerForm, WorkerFormErrors } from '@/utils/workers';
import { AddServerModal } from './AddServerModal';
import { DeploymentProgress, DeploymentWatch } from './DeploymentProgress';
import { OpsTokenCallout } from './OpsTokenCallout';

const EMPTY: WorkerForm = { serverId: '', name: '', scale: '1', cpus: '', memory: '', memoryUnit: 'g' };

/** Provisions workers on a registered server: POST /deployments with component "worker". */
export const CreateWorkerModal: React.FC<{ onClose: () => void; currentWorkers: Worker[]; initialServerId?: string }> = ({ onClose, currentWorkers, initialServerId = '' }) => {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<WorkerForm>({ ...EMPTY, serverId: initialServerId });
  const [errors, setErrors] = useState<WorkerFormErrors>({});
  const [watch, setWatch] = useState<DeploymentWatch | null>(null);
  const [addingServer, setAddingServer] = useState(false);
  const hasOps = !!session?.opsToken;

  const serversQuery = useQuery({ queryKey: ['ops', 'servers'], queryFn: fetchServers, enabled: hasOps });
  const servers = serversQuery.data ?? [];
  // With exactly one server there is nothing to choose.
  useEffect(() => {
    if (servers.length === 1) setForm((f) => (f.serverId ? f : { ...f, serverId: servers[0].id }));
  }, [servers]);

  const set = <K extends keyof WorkerForm>(key: K, value: WorkerForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const { errors: found, params } = validateWorkerForm(form);
      setErrors(found);
      if (!params) throw new Error('Fix the highlighted fields.');
      const deployment = await deployWorkers(form.serverId, params);
      return { deployment, params };
    },
    onSuccess: ({ deployment, params }) => {
      queryClient.invalidateQueries({ queryKey: ['ops', 'deployments'] });
      setWatch({ deployment, expected: params.scale, name: params.name, knownIds: currentWorkers.map((w) => w.id) });
    },
  });

  // Server-side validation errors (400 invalid_input) carry the master's reason in details.cause.
  const submitError = (() => {
    const err = mutation.error;
    if (!err || err.message === 'Fix the highlighted fields.') return '';
    const cause = err instanceof ApiError ? (err.details as { cause?: string } | null)?.cause : undefined;
    return cause ? `${errorMessage(err)}: ${cause}` : errorMessage(err);
  })();

  const server = servers.find((s) => s.id === form.serverId);

  return (
    <>
      <Modal isOpen={!addingServer} onClose={onClose} title={watch ? 'Creating workers' : 'Create workers'} subtitle={watch ? `On ${server?.name ?? 'the server'} · deployment ${watch.deployment.id.slice(0, 8)}` : 'Start worker containers on one of your servers. They register with this master automatically.'} maxWidth="2xl">
        {!hasOps ? (
          <OpsTokenCallout />
        ) : watch ? (
          <>
            <DeploymentProgress watch={watch} />
            <div className="flex justify-end">
              <Button onClick={onClose}>Close</Button>
            </div>
          </>
        ) : (
          <QueryState isLoading={serversQuery.isLoading} error={serversQuery.error} onRetry={() => serversQuery.refetch()}>
            <form
              className="space-y-5"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate();
              }}
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    label="Server"
                    value={form.serverId}
                    onChange={(e) => set('serverId', e.target.value)}
                    options={[{ label: servers.length ? 'Choose a server…' : 'No servers yet: add one', value: '' }, ...servers.map((s) => ({ label: `${s.name} · ${s.host}${s.last_error ? ' (last check failed)' : ''}`, value: s.id }))]}
                    error={errors.serverId}
                    helperText={server?.last_error ? `Last check: ${server.last_error}` : 'Docker and the O_Rabbit project folder must be ready on it.'}
                  />
                </div>
                <Button type="button" variant="secondary" icon={Plus} onClick={() => setAddingServer(true)}>Add server</Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Worker name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value.toLowerCase())}
                  placeholder="etl"
                  error={errors.name}
                  helperText="Optional. Workers get IDs like etl-1a2b3c4d5e6f, and the group can be redeployed on its own."
                />
                <Input
                  label="Number of workers"
                  type="number"
                  min={1}
                  max={MAX_WORKER_SCALE}
                  value={form.scale}
                  onChange={(e) => set('scale', e.target.value)}
                  error={errors.scale}
                  helperText="Concurrency: each worker runs one task at a time."
                />
              </div>

              <fieldset className="space-y-3 rounded-md border border-line p-4">
                <legend className="px-1 text-xs font-medium text-fg-muted">Resource limits per worker (optional)</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="CPU limit" inputMode="decimal" value={form.cpus} onChange={(e) => set('cpus', e.target.value)} placeholder="no limit" error={errors.cpus} helperText="CPUs, e.g. 1.5" />
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <Input label="Memory limit" inputMode="numeric" value={form.memory} onChange={(e) => set('memory', e.target.value)} placeholder="no limit" error={errors.memory} helperText="Whole number" />
                    </div>
                    <div className={errors.memory ? 'mb-6' : 'mb-[1.4rem]'}>
                      <Segmented<'m' | 'g'> value={form.memoryUnit} onChange={(v) => set('memoryUnit', v)} options={[{ label: 'MB', value: 'm' }, { label: 'GB', value: 'g' }]} />
                    </div>
                  </div>
                </div>
              </fieldset>

              <p className="text-xs text-fg-subtle">
                Master address, worker token and TLS come from <code className="rounded bg-raised px-1">.env.worker</code> on the server.
              </p>

              {submitError && <p role="alert" className="break-words rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{submitError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" icon={Rocket} loading={mutation.isPending}>Create workers</Button>
              </div>
            </form>
          </QueryState>
        )}
      </Modal>
      {addingServer && <AddServerModal onClose={() => setAddingServer(false)} onCreated={(s) => set('serverId', s.id)} />}
    </>
  );
};
