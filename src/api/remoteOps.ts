// Remote operations: SSH servers and deployments. These routes accept only the
// remote-operations token (opsClient), never the data API token.
import { ApiError, opsClient, Session } from './client';
import { Deployment, ProjectValidation, Server, ServerCreateRequest, SshTestResult, WorkerDeploymentParams } from './types';

export async function fetchServers(): Promise<Server[]> {
  return (await opsClient<{ items: Server[] | null }>('servers')).items ?? [];
}

export function createServer(req: ServerCreateRequest): Promise<Server> {
  return opsClient<Server>('servers', { method: 'POST', body: JSON.stringify(req) });
}

export function deleteServer(id: string): Promise<void> {
  return opsClient<void>(`servers/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** Connects over SSH with the stored credential and pinned host key. */
export function testServerSsh(id: string): Promise<SshTestResult> {
  return opsClient<SshTestResult>(`servers/${encodeURIComponent(id)}/ssh/test`, { method: 'POST', body: '{}' });
}

/** Checks the server's project folder has the deploy scripts and Compose files. */
export function validateServerProject(id: string): Promise<ProjectValidation> {
  return opsClient<ProjectValidation>(`servers/${encodeURIComponent(id)}/project/validate`, { method: 'POST', body: '{}' });
}

export async function fetchDeployments(serverId = ''): Promise<Deployment[]> {
  const qs = serverId ? `?server_id=${encodeURIComponent(serverId)}` : '';
  return (await opsClient<{ items: Deployment[] | null }>(`deployments${qs}`)).items ?? [];
}

/** Starts deploy-worker.sh on the server. Returns at once; follow the event stream for progress. */
export async function deployWorkers(serverId: string, params: WorkerDeploymentParams): Promise<Deployment> {
  const res = await opsClient<{ deployment: Deployment }>('deployments', {
    method: 'POST',
    body: JSON.stringify({ server_id: serverId, component: 'worker', params }),
  });
  return res.deployment;
}

/**
 * Checks an ops token before it is saved: GET /servers succeeds only with the right token.
 * Turns the master's two failure modes into messages a user can act on.
 */
export async function verifyOpsToken(session: Session): Promise<void> {
  try {
    await opsClient('servers', {}, session);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      throw new Error('Remote operations are disabled on this master (ORABBIT_REMOTE_OPS_AUTH_TOKEN is not set there). Leave the field empty.');
    }
    throw err;
  }
}
