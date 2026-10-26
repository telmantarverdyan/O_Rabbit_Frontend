import React, { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, Check, Circle, FileCode2, FileUp, Loader2, Play, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { fetchSourceEngines } from '@/api/connections';
import { submitRun } from '@/api/runs';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { PageTitle, Panel, QueryState, TextArea } from '@/components/common/QueryState';
import { useToast } from '@/components/common/Toast';
import { CliRunPlan, CliRunStep, executeCliRun, isCliRunFile, planCliRun, readRunFile } from '@/utils/cliRunFile';
import { buildRequest, parseRunFile, RunForm } from '@/utils/runForm';

const EXAMPLE = `# orabbit-client run file. The same file works with:
#   orabbit-client run submit --file run.yaml
source:
  name: local-postgres
  engine: postgres
  dsn: postgres://user:password@postgres:5432/mydb?sslmode=disable

target:
  name: local-minio
  endpoint: http://minio:9000
  region: us-east-1
  bucket: bucket1
  prefix: exports
  force_path_style: true
  access_key_id: minioadmin
  secret_access_key: change-me

job:
  name: export-people
  target_namespace: demo
  target_table: people
  write_mode: overwrite
  incremental: false
  table: public.people
  cursor_column: id
  auto_tune: true
`;

const STEPS: Array<{ id: CliRunStep; label: string }> = [
  { id: 'source', label: 'Source connection' },
  { id: 'target', label: 'Target connection' },
  { id: 'job', label: 'Job' },
  { id: 'run', label: 'Run' },
];

type Parsed =
  | { kind: 'cli'; plan: CliRunPlan }
  | { kind: 'one-shot'; form: RunForm }
  | { kind: 'error'; message: string };

const Row: React.FC<{ label: string; value?: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5">
    <dt className="text-xs text-fg-muted">{label}</dt>
    <dd className={clsx('min-w-0 truncate text-right text-sm text-fg', mono && 'font-mono text-xs')}>{value || <span className="text-fg-subtle">—</span>}</dd>
  </div>
);

export const RunFromFile: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState<Partial<Record<CliRunStep, string>>>({});
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState('');

  const enginesQuery = useQuery({ queryKey: ['source-engines'], queryFn: fetchSourceEngines, staleTime: 60000 });

  const parsed = useMemo<Parsed | null>(() => {
    if (!text.trim() || !enginesQuery.data) return null;
    try {
      const data = readRunFile(text);
      if (isCliRunFile(data)) return { kind: 'cli', plan: planCliRun(data, enginesQuery.data) };
      return { kind: 'one-shot', form: parseRunFile(text).form };
    } catch (err) {
      return { kind: 'error', message: errorMessage(err) };
    }
  }, [text, enginesQuery.data]);

  const load = async (file: File) => {
    setFileName(file.name);
    setText(await file.text());
    setDone({});
    setRunError('');
  };

  const start = async () => {
    if (!parsed || parsed.kind === 'error') return;
    setRunning(true);
    setRunError('');
    setDone({});
    try {
      if (parsed.kind === 'cli') {
        const res = await executeCliRun(parsed.plan, (step, detail) => setDone((d) => ({ ...d, [step]: detail })));
        toast.success(`Run started with ${res.tasks.length} tasks.`, 'Run started');
        navigate(`/runs/${res.run.id}`);
      } else {
        const res = await submitRun(buildRequest(parsed.form));
        toast.success(`Run ${res.run_id} is ${res.status.toLowerCase()}.`, 'Run started');
        navigate(`/runs/${res.run_id}`);
      }
    } catch (err) {
      setRunError(errorMessage(err));
    } finally {
      setRunning(false);
    }
  };

  const plan = parsed?.kind === 'cli' ? parsed.plan : null;
  const meta = plan?.targetConnection.metadata as Record<string, unknown> | undefined;
  const opts = plan?.job.options_json as Record<string, unknown> | undefined;
  const iceberg = opts?.iceberg as Record<string, unknown> | undefined;
  const nextStep = STEPS.find((s) => !done[s.id])?.id;

  return (
    <div className="space-y-6">
      <PageTitle
        title="Run from file"
        subtitle={
          <>
            Start a run from an <code className="rounded bg-raised px-1 py-0.5 text-xs">orabbit-client</code> run file (YAML or JSON), exactly like{' '}
            <code className="rounded bg-raised px-1 py-0.5 text-xs">orabbit-client run submit --file run.yaml</code>: the connections and job are created or updated by name, then the job starts.
          </>
        }
      />

      <QueryState isLoading={enginesQuery.isLoading} error={enginesQuery.error} onRetry={() => enginesQuery.refetch()}>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) load(file);
              }}
              className={clsx(
                'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
                dragging ? 'border-accent bg-accent/5' : 'border-line bg-card'
              )}
            >
              <div className="rounded-full bg-raised p-3">
                <FileUp className="h-5 w-5 text-fg-muted" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-fg">{fileName || 'Drop run.yaml here'}</p>
                <p className="mt-0.5 text-xs text-fg-subtle">.yaml, .yml or .json · or paste it below</p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept=".yaml,.yml,.json,application/json,application/yaml,text/yaml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) load(file);
                    e.target.value = '';
                  }}
                />
                <Button variant="secondary" size="sm" icon={Upload} onClick={() => fileInput.current?.click()}>Choose file</Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={FileCode2}
                  onClick={() => {
                    setText(EXAMPLE);
                    setFileName('example run.yaml');
                    setDone({});
                  }}
                >
                  Insert example
                </Button>
              </div>
            </div>

            <TextArea
              label="Run file"
              rows={20}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setDone({});
              }}
              placeholder={EXAMPLE}
              helperText="Secrets in this file (DSN, S3 keys) are sent to the master, which encrypts them. They are not stored in the browser."
            />
          </div>

          <div className="space-y-4 lg:col-span-2 lg:sticky lg:top-0 lg:self-start">
            <Panel title="What will happen">
              {!parsed && <p className="text-sm text-fg-subtle">Load or paste a run file to see the plan.</p>}

              {parsed?.kind === 'error' && (
                <div role="alert" className="flex gap-2.5 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                  <span className="break-words">{parsed.message}</span>
                </div>
              )}

              {parsed?.kind === 'one-shot' && (
                <div className="space-y-3 text-sm text-fg-muted">
                  <p>This is a one-shot run file (the format the New run page saves). It starts through <code className="text-xs">POST /runs/submit</code>.</p>
                  <dl className="divide-y divide-line/60">
                    <Row label="Engine" value={parsed.form.engine} />
                    <Row label={parsed.form.mode === 'query' ? 'Query' : 'Table'} value={parsed.form.mode === 'query' ? 'custom SQL' : parsed.form.table} mono />
                    <Row label="Bucket" value={parsed.form.s3Bucket || 'master default'} />
                  </dl>
                  <Button variant="secondary" size="sm" icon={ArrowRight} onClick={() => navigate('/runs/new', { state: { form: parsed.form } })}>
                    Review in New run
                  </Button>
                </div>
              )}

              {plan && (
                <div className="space-y-4">
                  <dl className="divide-y divide-line/60">
                    <Row label="Source" value={`${plan.sourceConnection.name} · ${plan.sourceConnection.engine}`} />
                    <Row label="Reads" value={plan.job.source_sql ? 'custom SQL' : String(opts?.table ?? '')} mono />
                    <Row label="Cursor" value={plan.job.hwm_column ?? undefined} mono />
                    <Row label="Target" value={`${plan.targetConnection.name} · s3://${meta?.bucket}${meta?.prefix ? `/${meta.prefix}` : ''}`} />
                    <Row label="Job" value={plan.job.name} />
                    <Row label="Writes" value={`${plan.job.target_namespace}.${plan.job.target_table}`} mono />
                    <Row label="Mode" value={`${plan.job.write_mode || 'default'}${plan.job.incremental ? ' · incremental' : ' · full'}`} />
                    <Row label="Planning" value={opts?.auto_tune ? 'auto-tune' : `manual · ${opts?.max_in_flight_tasks} in flight`} />
                    <Row label="Iceberg" value={iceberg ? `${iceberg.engine} · ${iceberg.table || 'default table'}` : 'off'} />
                  </dl>

                  {plan.warnings.length > 0 && (
                    <ul className="space-y-1.5 rounded-md border border-warn/30 bg-warn/10 p-3 text-xs text-warn">
                      {plan.warnings.map((w) => (
                        <li key={w} className="flex gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}

                  <ol className="space-y-2" aria-label="Progress">
                    {STEPS.map((s) => {
                      const detail = done[s.id];
                      const active = running && s.id === nextStep;
                      return (
                        <li key={s.id} className="flex items-start gap-2.5 text-sm">
                          {detail ? (
                            <Check className="mt-0.5 h-4 w-4 text-accent" aria-hidden />
                          ) : active ? (
                            <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-info" aria-hidden />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 text-fg-subtle" aria-hidden />
                          )}
                          <span className={detail ? 'text-fg' : 'text-fg-muted'}>{detail || s.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {runError && (
                <p role="alert" className="mt-4 break-words rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                  {runError}
                </p>
              )}

              {parsed && parsed.kind !== 'error' && (
                <Button size="lg" icon={Play} loading={running} onClick={start} className="mt-5 w-full">
                  Start run
                </Button>
              )}
            </Panel>
            <p className="px-1 text-xs text-fg-subtle">
              Prefer a form? Use <Link to="/runs/new" className="text-accent hover:underline">New run</Link> for one-shot runs with every option.
            </p>
          </div>
        </div>
      </QueryState>
    </div>
  );
};
