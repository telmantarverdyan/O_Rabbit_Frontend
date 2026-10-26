import { apiClient } from './client';

/** One Prometheus sample: `name{label="v"} 12`. */
export interface MetricSample {
  name: string;
  labels: Record<string, string>;
  value: number;
}

/** Parses the Prometheus text format served by the master's /metrics. */
export function parsePrometheus(text: string): MetricSample[] {
  const samples: MetricSample[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^([a-zA-Z_:][\w:]*)(?:\{([^}]*)\})?\s+(\S+)/.exec(line);
    if (!match) continue;
    const labels: Record<string, string> = {};
    for (const pair of (match[2] ?? '').matchAll(/(\w+)="((?:[^"\\]|\\.)*)"/g)) labels[pair[1]] = pair[2];
    const value = Number(match[3]);
    if (Number.isFinite(value)) samples.push({ name: match[1], labels, value });
  }
  return samples;
}

export interface MasterMetrics {
  samples: MetricSample[];
  /** Sum of samples named `name`, grouped by one label (for example runs by status). */
  byLabel: (name: string, label: string) => Record<string, number>;
  scalar: (name: string) => number | undefined;
}

export async function fetchMetrics(): Promise<MasterMetrics> {
  const samples = parsePrometheus(await apiClient<string>('/metrics'));
  return {
    samples,
    byLabel: (name, label) => {
      const out: Record<string, number> = {};
      for (const s of samples) if (s.name === name && s.labels[label] !== undefined) out[s.labels[label]] = (out[s.labels[label]] ?? 0) + s.value;
      return out;
    },
    scalar: (name) => samples.find((s) => s.name === name)?.value,
  };
}
