import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Download, Play, ShieldCheck, Upload } from 'lucide-react';
import { fetchSourceEngines } from '@/api/connections';
import { submitRun, validateRun } from '@/api/runs';
import { ApiError, errorMessage } from '@/api/client';
import { IcebergEngine, RunSubmitRequest, RunValidation } from '@/api/types';
import { Button } from '@/components/common/Button';
import { Input, Select } from '@/components/common/Input';
import { Checkbox, PageTitle, Panel, QueryState, TextArea } from '@/components/common/QueryState';
import { useToast } from '@/components/common/Toast';
import { EMPTY_FORM, RunForm, TRI_OPTIONS, TriState, buildRequest, parseRunFile, redact, withoutSecrets } from '@/utils/runForm';


export const NewRun: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState<RunForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<unknown>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadFile = async (file: File) => {
    try {
      const { form: loaded, kind, ignored } = parseRunFile(await file.text());
      setForm(loaded);
      setValidation(null);
      setFormError(null);
      toast.success(
        kind === 'cli'
          ? `Loaded an orabbit-client run file.${ignored.length ? ` Not used by one-shot runs: ${ignored.join(', ')}.` : ''}`
          : 'Loaded a saved run.',
        file.name
      );
      if (!loaded.dsn) toast.info('The file has no DSN. Enter it before starting the run.');
    } catch (err) {
      toast.error(errorMessage(err), `Could not load ${file.name}`);
    }
  };

  const saveFile = () => {
    try {
      const body = JSON.stringify(withoutSecrets(buildRequest(form)), null, 2);
      const url = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `orabbit-run-${form.table || form.engine || 'config'}.json`.replace(/[^\w.-]+/g, '_');
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFormError(err);
    }
  };
  const [validation, setValidation] = useState<RunValidation | null>(null);

  const enginesQuery = useQuery({ queryKey: ['source-engines'], queryFn: fetchSourceEngines, staleTime: 60000 });
  const engines = useMemo(
    () => (enginesQuery.data ?? []).filter((e) => e.oneshot_submit_supported !== false),
    [enginesQuery.data]
  );
  const engine = engines.find((e) => e.engine === form.engine);

  const set = <K extends keyof RunForm>(key: K, value: RunForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidation(null);
  };

  // Pick the first engine once the list arrives, and keep the mode one the engine supports.
  React.useEffect(() => {
    if (!form.engine && engines.length) set('engine', engines[0].engine);
  }, [engines, form.engine]);
  React.useEffect(() => {
    if (!engine) return;
    if (form.mode === 'table' && !engine.table_mode_supported && engine.query_supported) set('mode', 'query');
    if (form.mode === 'query' && !engine.query_supported) set('mode', 'table');
  }, [engine, form.mode]);

  const preview = useMemo(() => {
    try {
      return JSON.stringify(redact(buildRequest(form)), null, 2);
    } catch (err) {
      return `// ${errorMessage(err)}`;
    }
  }, [form]);

  const validateMutation = useMutation({
    mutationFn: (req: RunSubmitRequest) => validateRun(req),
    onSuccess: (res) => {
      setFormError(null);
      setValidation(res);
      toast.success('The master accepted this run configuration.', 'Valid');
    },
    onError: (err) => setFormError(err),
  });

  const submitMutation = useMutation({
    mutationFn: (req: RunSubmitRequest) => submitRun(req),
    onSuccess: (res) => {
      toast.success(`Run ${res.run_id} is ${res.status.toLowerCase()}.`, 'Run started');
      navigate(`/runs/${res.run_id}`);
    },
    onError: (err) => setFormError(err),
  });

  const run = (action: 'validate' | 'submit') => {
    setFormError(null);
    let req: RunSubmitRequest;
    try {
      req = buildRequest(form);
    } catch (err) {
      setFormError(err);
      return;
    }
    if (action === 'validate') validateMutation.mutate(req);
    else submitMutation.mutate(req);
  };

  const incrementalAllowed = form.mode === 'table' ? engine?.ordered_cursor_supported !== false : !!engine?.query_incremental_supported;
  const fieldErrors = formError instanceof ApiError ? formError.fieldErrors : [];

  return (
    <div className="space-y-6">
      <PageTitle
        title="New Run"
        subtitle="Export a table or query to Parquet on S3, optionally registered in Iceberg (POST /runs/submit)."
        actions={
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) loadFile(file);
                e.target.value = '';
              }}
            />
            <Button variant="outline" icon={Upload} onClick={() => fileInputRef.current?.click()} title="Load a saved run or an orabbit-client run file (JSON)">
              Load file
            </Button>
            <Button variant="outline" icon={Download} onClick={saveFile} title="Save this form as JSON, without the DSN and S3 secret key">
              Save
            </Button>
          </>
        }
      />

      <QueryState isLoading={enginesQuery.isLoading} error={enginesQuery.error} onRetry={() => enginesQuery.refetch()} isEmpty={!engines.length} emptyMessage="The master reports no source engines that support one-shot runs.">
        <form
          className="grid gap-6 lg:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            run('submit');
          }}
        >
          <div className="space-y-6 lg:col-span-2">
            <Panel title="1 · Source">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Engine"
                  value={form.engine}
                  onChange={(e) => set('engine', e.target.value)}
                  options={engines.map((e) => ({ label: e.engine, value: e.engine }))}
                />
                <Select
                  label="Mode"
                  value={form.mode}
                  onChange={(e) => set('mode', e.target.value as RunForm['mode'])}
                  options={[
                    ...(engine?.table_mode_supported !== false ? [{ label: 'Table', value: 'table' }] : []),
                    ...(engine?.query_supported ? [{ label: `Query${engine.query_languages?.length ? ` (${engine.query_languages.join(', ')})` : ''}`, value: 'query' }] : []),
                  ]}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="DSN"
                    type="password"
                    value={form.dsn}
                    onChange={(e) => set('dsn', e.target.value)}
                    placeholder="postgres://user:pass@db-host:5432/app or s3://bucket/path"
                    helperText="Workers open this connection, so localhost means the worker's host, not the master's. Never logged."
                    autoComplete="off"
                    required
                  />
                </div>
                {form.mode === 'table' ? (
                  <Input label="Table" value={form.table} onChange={(e) => set('table', e.target.value)} placeholder="public.orders" required />
                ) : (
                  <div className="sm:col-span-2">
                    <TextArea label="Query" rows={5} value={form.query} onChange={(e) => set('query', e.target.value)} placeholder="SELECT * FROM orders WHERE ..." required />
                  </div>
                )}
                <Input
                  label="Cursor column"
                  value={form.cursorColumn}
                  onChange={(e) => set('cursorColumn', e.target.value)}
                  placeholder="id"
                  helperText={engine?.ordered_cursor_supported ? 'An ordered column used to split the table into tasks.' : 'This engine cannot split by cursor.'}
                />
                <Input label="Where clause" value={form.whereClause} onChange={(e) => set('whereClause', e.target.value)} placeholder="created_at >= '2026-01-01'" />
                <Input label="Select columns" value={form.selectColumns} onChange={(e) => set('selectColumns', e.target.value)} placeholder="id, name, created_at" helperText="Comma separated. Empty selects all." />
                <Input label="Record path" value={form.recordPath} onChange={(e) => set('recordPath', e.target.value)} helperText="For nested sources (for example JSON documents)." />
                <Input label="File format" value={form.format} onChange={(e) => set('format', e.target.value)} placeholder="parquet, csv, json..." helperText="For s3:// file sources." />
                <div className="sm:col-span-2">
                  <TextArea label="Column types (JSON)" rows={2} value={form.columnTypes} onChange={(e) => set('columnTypes', e.target.value)} placeholder='{"amount": "decimal(18,2)"}' />
                </div>
                <div className="sm:col-span-2">
                  <Checkbox
                    label="Incremental"
                    checked={form.incremental}
                    onChange={(v) => set('incremental', v)}
                    helperText={incrementalAllowed ? 'Only read rows newer than the last run (needs a cursor column).' : 'Not supported by this engine in this mode.'}
                  />
                </div>
              </div>
            </Panel>

            <Panel title="2 · Target (S3)">
              <p className="mb-4 text-[11px] text-emerald-500/60">Leave empty to use the master&apos;s configured S3 defaults.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="S3 endpoint" value={form.s3Endpoint} onChange={(e) => set('s3Endpoint', e.target.value)} placeholder="http://minio:9000" />
                <Input label="S3 region" value={form.s3Region} onChange={(e) => set('s3Region', e.target.value)} placeholder="us-east-1" />
                <Input label="S3 bucket" value={form.s3Bucket} onChange={(e) => set('s3Bucket', e.target.value)} />
                <Input label="S3 prefix" value={form.s3Prefix} onChange={(e) => set('s3Prefix', e.target.value)} placeholder="exports/orders" />
                <Input label="Access key ID" value={form.s3AccessKeyId} onChange={(e) => set('s3AccessKeyId', e.target.value)} autoComplete="off" />
                <Input label="Secret access key" type="password" value={form.s3SecretAccessKey} onChange={(e) => set('s3SecretAccessKey', e.target.value)} autoComplete="off" />
                <Select label="Force path style" value={form.s3ForcePathStyle} onChange={(e) => set('s3ForcePathStyle', e.target.value as TriState)} options={TRI_OPTIONS} helperText="Usually Yes for MinIO." />
              </div>
            </Panel>

            <Panel title="3 · Iceberg registration">
              <Checkbox label="Register the files in an Iceberg catalog" checked={form.icebergEnabled} onChange={(v) => set('icebergEnabled', v)} />
              {form.icebergEnabled && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Engine"
                    value={form.icebergEngine}
                    onChange={(e) => set('icebergEngine', e.target.value as IcebergEngine)}
                    options={[
                      { label: 'rest-go (Iceberg REST catalog)', value: 'rest-go' },
                      { label: 'ice (Altinity ice CLI)', value: 'ice' },
                    ]}
                  />
                  <Input label="Iceberg table" value={form.icebergTable} onChange={(e) => set('icebergTable', e.target.value)} placeholder="namespace.table" />
                  <div className="sm:col-span-2">
                    <Input label="Partition keys" value={form.partitionKeys} onChange={(e) => set('partitionKeys', e.target.value)} placeholder="region, day" helperText="Comma separated." />
                  </div>
                  <div className="sm:col-span-2">
                    <TextArea
                      label="Options (JSON)"
                      rows={4}
                      value={form.icebergOptions}
                      onChange={(e) => set('icebergOptions', e.target.value)}
                      placeholder={'{\n  "uri": "http://ice-rest:5000",\n  "schema_evolution": "add_columns",\n  "s3": { "endpoint": "http://minio:9000", "path_style_access": true }\n}'}
                      helperText="Run options: uri, bearer_token, s3, partition_spec, sort_order, schema_evolution, target_file_size, distribution_mode, metrics_mode, metadata_retention, upsert, credential_vending."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextArea label="Config YAML (optional defaults)" rows={4} value={form.icebergConfigYaml} onChange={(e) => set('icebergConfigYaml', e.target.value)} />
                  </div>
                </div>
              )}
            </Panel>

            <Panel title="4 · Performance & scheduling">
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Auto-tune" value={form.autoTune} onChange={(e) => set('autoTune', e.target.value as TriState)} options={TRI_OPTIONS} helperText="Let the planner pick task sizes." />
                <Input label="Planned tasks" type="number" min={0} value={form.plannedTasks} onChange={(e) => set('plannedTasks', e.target.value)} />
                <Input label="Max in-flight tasks" type="number" min={0} value={form.maxInFlightTasks} onChange={(e) => set('maxInFlightTasks', e.target.value)} />
                <Input label="Target rows per task" type="number" min={0} value={form.targetRowsPerTask} onChange={(e) => set('targetRowsPerTask', e.target.value)} />
                <Input label="Target file bytes" type="number" min={0} value={form.targetFileBytes} onChange={(e) => set('targetFileBytes', e.target.value)} placeholder="134217728" />
                <Select
                  label="Consistency"
                  value={form.consistencyMode}
                  onChange={(e) => set('consistencyMode', e.target.value as RunForm['consistencyMode'])}
                  options={[
                    { label: 'Master default (EVENTUAL)', value: '' },
                    { label: 'EVENTUAL', value: 'EVENTUAL' },
                    { label: 'STRONG_SNAPSHOT', value: 'STRONG_SNAPSHOT' },
                    { label: 'STRONG_CDC', value: 'STRONG_CDC' },
                  ]}
                />
                <Input label="Worker pool" value={form.workerPool} onChange={(e) => set('workerPool', e.target.value)} helperText="Only workers enrolled in this pool take the tasks." />
              </div>
            </Panel>
          </div>

          <div className="space-y-6 lg:sticky lg:top-0 lg:self-start">
            <Panel title="Submit">
              <div className="space-y-3">
                <Button type="button" variant="secondary" icon={ShieldCheck} className="w-full" loading={validateMutation.isPending} onClick={() => run('validate')}>
                  Validate only
                </Button>
                <Button type="submit" variant="cyber" icon={Play} className="w-full" loading={submitMutation.isPending}>
                  Start run
                </Button>
                {validation && !formError && <ValidationSummary validation={validation} />}
                {formError != null && (
                  <div role="alert" className="space-y-1 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300 break-words">
                    <p>{formError instanceof ApiError ? formError.message : errorMessage(formError)}</p>
                    {fieldErrors.length > 0 && (
                      <ul className="list-disc pl-4">
                        {fieldErrors.map((f) => (
                          <li key={`${f.field}-${f.error}`}><span className="text-rose-200">{f.field}</span>: {f.error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </Panel>
            <Panel title="Request preview">
              <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-all text-[11px] text-emerald-300/80">{preview}</pre>
            </Panel>
          </div>
        </form>
      </QueryState>
    </div>
  );
};

const ValidationSummary: React.FC<{ validation: RunValidation }> = ({ validation }) => {
  const derived = validation.derived ?? {};
  const show = (key: string) => {
    const v = derived[key];
    return v === undefined || v === null || v === '' ? null : (
      <li key={key}>
        <span className="text-emerald-500/70">{key}: </span>
        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
      </li>
    );
  };
  return (
    <div className="space-y-2 text-xs text-emerald-200">
      <p className="flex items-center gap-1.5 text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" /> Valid. Ready to start.
      </p>
      {validation.available_workers === 0 && (
        <p className="text-amber-300">No active workers right now: the run will wait until one connects.</p>
      )}
      <ul className="space-y-0.5 text-[11px] break-all">
        <li><span className="text-emerald-500/70">available_workers: </span>{validation.available_workers}</li>
        {['job_name', 'target_connection_name', 'target_prefix', 'iceberg_table', 'write_mode'].map(show)}
      </ul>
      {(validation.type_warnings?.length ?? 0) > 0 && (
        <ul className="list-disc pl-4 text-[11px] text-amber-300">
          {validation.type_warnings.map((w, i) => <li key={i}>{w.column ? `${w.column}: ` : ''}{w.message ?? JSON.stringify(w)}</li>)}
        </ul>
      )}
      {(validation.type_mappings?.length ?? 0) > 0 && (
        <details className="text-[11px]">
          <summary className="cursor-pointer text-emerald-400">Schema ({validation.type_mappings.length} columns)</summary>
          <table className="mt-2 w-full">
            <tbody>
              {validation.type_mappings.map((m) => (
                <tr key={m.column} className={m.fallback ? 'text-amber-300' : ''}>
                  <td className="pr-2">{m.column}</td>
                  <td className="pr-2 text-emerald-500/80">{m.logical_type}</td>
                  <td>{m.target_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
};
