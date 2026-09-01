// O_Rabbit Cluster Configuration Bundle Exporter & Importer

export interface ClusterConfigBundle {
  version: '1.0.0';
  exportedAt: string;
  cluster: {
    name: string;
    backendUrl?: string;
  };
  jobs: any[];
  connections: any[];
  schedules: any[];
  alerts: any;
}

export function exportClusterConfigToYaml(
  jobs: any[],
  connections: any[],
  schedules: any[],
  alerts: any
): string {
  const bundle: ClusterConfigBundle = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    cluster: {
      name: 'orabbit-production-cluster',
    },
    jobs,
    connections: connections.map((c) => ({
      name: c.name,
      engine: c.engine,
      kind: c.kind,
      metadata_json: c.metadata_json,
    })),
    schedules,
    alerts,
  };

  return JSON.stringify(bundle, null, 2);
}

export function downloadConfigFile(content: string, filename: string = 'orabbit-config.json') {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
