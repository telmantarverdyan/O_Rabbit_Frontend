import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Circle, Loader2, Server as ServerIcon, X } from 'lucide-react';
import { createServer, testServerSsh, validateServerProject } from '@/api/remoteOps';
import { errorMessage } from '@/api/client';
import { Server, ServerAuthType } from '@/api/types';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { Segmented, TextArea } from '@/components/common/QueryState';

type CheckState = { state: 'idle' | 'running' | 'ok' | 'failed'; detail?: string };

const FINGERPRINT = /^SHA256:[A-Za-z0-9+/]{43}=?$/;

/**
 * Registers an SSH server where workers can be deployed, then checks SSH and the
 * project folder right away so problems show up here, not in the middle of a deploy.
 */
export const AddServerModal: React.FC<{ onClose: () => void; onCreated?: (server: Server) => void }> = ({ onClose, onCreated }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: '22',
    user: 'root',
    projectDir: '/root/O_Rabbit',
    authType: 'private_key' as ServerAuthType,
    privateKey: '',
    passphrase: '',
    password: '',
    fingerprint: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<Server | null>(null);
  const [ssh, setSsh] = useState<CheckState>({ state: 'idle' });
  const [project, setProject] = useState<CheckState>({ state: 'idle' });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Give the server a name.';
    if (!form.host.trim() || /\s|\/|:\/\//.test(form.host.trim())) e.host = 'Enter a hostname or IP address only, without a scheme or path.';
    const port = Number(form.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) e.port = 'Enter a port from 1 to 65535.';
    if (!form.user.trim()) e.user = 'Enter the SSH user.';
    if (!form.projectDir.trim().startsWith('/')) e.projectDir = 'Enter the absolute path of the O_Rabbit checkout on the server.';
    if (form.authType === 'private_key' && !form.privateKey.includes('PRIVATE KEY')) e.privateKey = 'Paste the full private key, including its BEGIN/END lines.';
    if (form.authType === 'password' && !form.password) e.password = 'Enter the SSH password.';
    if (!FINGERPRINT.test(form.fingerprint.trim())) e.fingerprint = 'Enter the SHA256:… host key fingerprint (see the hint below).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const runChecks = async (server: Server) => {
    setSsh({ state: 'running' });
    try {
      const res = await testServerSsh(server.id);
      setSsh({ state: 'ok', detail: `${res.remote_user}@${res.hostname || server.host} in ${res.latency_ms} ms` });
    } catch (err) {
      setSsh({ state: 'failed', detail: errorMessage(err) });
      setProject({ state: 'idle' });
      return;
    }
    setProject({ state: 'running' });
    try {
      const res = await validateServerProject(server.id);
      setProject(res.ok ? { state: 'ok', detail: res.project_dir } : { state: 'failed', detail: (res.errors ?? []).join('; ') || 'Project folder is incomplete.' });
    } catch (err) {
      setProject({ state: 'failed', detail: errorMessage(err) });
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;
    setSaving(true);
    try {
      const server = await createServer({
        name: form.name.trim(),
        host: form.host.trim(),
        ssh_port: Number(form.port),
        ssh_user: form.user.trim(),
        project_dir: form.projectDir.trim(),
        role_hints: ['worker'],
        credential: {
          auth_type: form.authType,
          username: form.user.trim(),
          host_key_fingerprint: form.fingerprint.trim(),
          ...(form.authType === 'private_key'
            ? { private_key: form.privateKey, ...(form.passphrase ? { passphrase: form.passphrase } : {}) }
            : { password: form.password }),
        },
      });
      setCreated(server);
      queryClient.invalidateQueries({ queryKey: ['ops', 'servers'] });
      onCreated?.(server);
      await runChecks(server);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const icon = (c: CheckState) =>
    c.state === 'ok' ? <Check className="h-4 w-4 text-accent" aria-hidden /> : c.state === 'failed' ? <X className="h-4 w-4 text-danger" aria-hidden /> : c.state === 'running' ? <Loader2 className="h-4 w-4 animate-spin text-info" aria-hidden /> : <Circle className="h-4 w-4 text-fg-subtle" aria-hidden />;

  if (created) {
    const ready = ssh.state === 'ok' && project.state === 'ok';
    return (
      <Modal isOpen onClose={onClose} title={`Server ${created.name} added`} subtitle={`${created.ssh_user}@${created.host}:${created.ssh_port}`}>
        <ul className="space-y-3 text-sm">
          <li className="flex gap-2.5">{icon(ssh)}<div><p className="text-fg">SSH connection</p>{ssh.detail && <p className={`break-words text-xs ${ssh.state === 'failed' ? 'text-danger' : 'text-fg-muted'}`}>{ssh.detail}</p>}</div></li>
          <li className="flex gap-2.5">{icon(project)}<div><p className="text-fg">Project folder with deploy scripts</p>{project.detail && <p className={`break-words text-xs ${project.state === 'failed' ? 'text-danger' : 'text-fg-muted'}`}>{project.detail}</p>}</div></li>
        </ul>
        {!ready && ssh.state !== 'running' && project.state !== 'running' && (
          <p className="text-xs text-fg-subtle">The server is saved. Fix the problem on the server, then use “Test” in the servers list.</p>
        )}
        <div className="flex justify-end gap-2">
          {!ready && ssh.state !== 'running' && project.state !== 'running' && <Button variant="secondary" onClick={() => runChecks(created)}>Check again</Button>}
          <Button onClick={onClose}>{ready ? 'Done' : 'Close'}</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen onClose={onClose} title="Add a server" subtitle="A Linux host with Docker and an O_Rabbit checkout, reachable by the master over SSH." maxWidth="2xl">
      <form className="space-y-4" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="etl-node-1" required error={errors.name} />
          <Input label="Host" icon={ServerIcon} value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="10.0.0.12" required error={errors.host} />
          <Input label="SSH user" value={form.user} onChange={(e) => set('user', e.target.value)} required error={errors.user} />
          <Input label="SSH port" type="number" min={1} max={65535} value={form.port} onChange={(e) => set('port', e.target.value)} error={errors.port} />
          <div className="sm:col-span-2">
            <Input label="Project folder" value={form.projectDir} onChange={(e) => set('projectDir', e.target.value)} required error={errors.projectDir} helperText="Must contain deploy-worker.sh, docker-compose.worker.yml and a filled-in .env.worker." />
          </div>
        </div>

        <Segmented<ServerAuthType>
          label="Authentication"
          value={form.authType}
          onChange={(v) => set('authType', v)}
          options={[{ label: 'Private key', value: 'private_key' }, { label: 'Password', value: 'password' }]}
        />
        {form.authType === 'private_key' ? (
          <div className="grid gap-4">
            <TextArea label="Private key" rows={5} value={form.privateKey} onChange={(e) => set('privateKey', e.target.value)} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" autoComplete="off" />
            {errors.privateKey && <p className="-mt-2 text-xs text-danger">{errors.privateKey}</p>}
            <Input label="Key passphrase (if any)" type="password" value={form.passphrase} onChange={(e) => set('passphrase', e.target.value)} autoComplete="off" />
          </div>
        ) : (
          <Input label="SSH password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} autoComplete="off" error={errors.password} />
        )}

        <Input
          label="Host key fingerprint"
          value={form.fingerprint}
          onChange={(e) => set('fingerprint', e.target.value)}
          placeholder="SHA256:…"
          required
          error={errors.fingerprint}
          helperText="Pins the server's identity so the master never talks to an impostor. Get it out of band: ssh-keyscan <host> | ssh-keygen -lf -"
        />
        <p className="text-xs text-fg-subtle">The credential is encrypted by the master and never shown again.</p>

        {submitError && <p role="alert" className="break-words rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">{submitError}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Add and check</Button>
        </div>
      </form>
    </Modal>
  );
};
