export function generateGrafanaDashboardJSON(): string {
  const dashboard = {
    annotations: {
      list: [
        {
          builtIn: 1,
          datasource: '-- Grafana --',
          enable: true,
          hide: true,
          name: 'Annotations & Alerts',
          type: 'dashboard',
        },
      ],
    },
    editable: true,
    fiscalYearStartMonth: 0,
    graphTooltip: 1,
    id: null,
    links: [],
    liveNow: true,
    panels: [
      {
        collapsed: false,
        gridPos: { h: 1, w: 24, x: 0, y: 0 },
        id: 1,
        title: 'O_Rabbit Ingestion Engine Telemetry',
        type: 'row',
      },
      {
        datasource: { type: 'prometheus', uid: 'prometheus' },
        fieldConfig: {
          defaults: {
            color: { mode: 'palette-classic' },
            custom: {
              axisCenteredZero: false,
              axisColorMode: 'text',
              axisLabel: 'Rows / Sec',
              drawStyle: 'line',
              fillOpacity: 25,
              gradientMode: 'opacity',
              lineInterpolation: 'smooth',
              lineWidth: 2,
            },
            unit: 'reqps',
          },
        },
        gridPos: { h: 8, w: 12, x: 0, y: 1 },
        id: 2,
        options: {
          legend: { calcs: ['lastNotNull', 'max'], displayMode: 'table', placement: 'bottom' },
          tooltip: { mode: 'multi', sort: 'desc' },
        },
        targets: [
          {
            datasource: { type: 'prometheus', uid: 'prometheus' },
            editorMode: 'code',
            expr: 'rate(orabbit_rows_written_total[1m])',
            legendFormat: 'Rows Extracted ({{job_id}})',
            range: true,
            refId: 'A',
          },
        ],
        title: 'Extraction Ingestion Throughput (Rows/s)',
        type: 'timeseries',
      },
      {
        datasource: { type: 'prometheus', uid: 'prometheus' },
        fieldConfig: {
          defaults: {
            color: { mode: 'palette-classic' },
            custom: {
              axisLabel: 'Bytes / Sec',
              drawStyle: 'line',
              fillOpacity: 20,
              lineInterpolation: 'smooth',
            },
            unit: 'Bps',
          },
        },
        gridPos: { h: 8, w: 12, x: 12, y: 1 },
        id: 3,
        options: {
          legend: { displayMode: 'table', placement: 'bottom' },
        },
        targets: [
          {
            datasource: { type: 'prometheus', uid: 'prometheus' },
            editorMode: 'code',
            expr: 'rate(orabbit_bytes_written_total[1m])',
            legendFormat: 'Parquet S3 Flushed Bytes/s',
            refId: 'A',
          },
        ],
        title: 'S3 Multipart Streaming Bandwidth',
        type: 'timeseries',
      },
      {
        datasource: { type: 'prometheus', uid: 'prometheus' },
        fieldConfig: {
          defaults: {
            color: { mode: 'thresholds' },
            thresholds: {
              mode: 'absolute',
              steps: [
                { color: 'red', value: null },
                { color: 'green', value: 1 },
              ],
            },
          },
        },
        gridPos: { h: 6, w: 8, x: 0, y: 9 },
        id: 4,
        options: {
          orientation: 'auto',
          reduceOptions: { calcs: ['lastNotNull'], fields: '', values: false },
        },
        targets: [
          {
            datasource: { type: 'prometheus', uid: 'prometheus' },
            expr: 'orabbit_workers_active_total',
            legendFormat: 'Active Workers',
            refId: 'A',
          },
        ],
        title: 'Active Worker Fleet Nodes',
        type: 'stat',
      },
      {
        datasource: { type: 'prometheus', uid: 'prometheus' },
        fieldConfig: {
          defaults: {
            color: { mode: 'palette-classic' },
            unit: 's',
          },
        },
        gridPos: { h: 6, w: 8, x: 8, y: 9 },
        id: 5,
        targets: [
          {
            datasource: { type: 'prometheus', uid: 'prometheus' },
            expr: 'histogram_quantile(0.99, sum(rate(orabbit_task_duration_seconds_bucket[5m])) by (le))',
            legendFormat: 'p99 Partition Task Latency',
            refId: 'A',
          },
        ],
        title: 'Task Execution Latency (p99)',
        type: 'timeseries',
      },
      {
        datasource: { type: 'prometheus', uid: 'prometheus' },
        fieldConfig: {
          defaults: {
            color: { mode: 'palette-classic' },
          },
        },
        gridPos: { h: 6, w: 8, x: 16, y: 9 },
        id: 6,
        targets: [
          {
            datasource: { type: 'prometheus', uid: 'prometheus' },
            expr: 'orabbit_iceberg_snapshots_committed_total',
            legendFormat: 'Iceberg Snapshots Committed',
            refId: 'A',
          },
        ],
        title: 'Iceberg Catalog Commit Velocity',
        type: 'stat',
      },
    ],
    refresh: '5s',
    schemaVersion: 39,
    style: 'dark',
    tags: ['orabbit', 'lakehouse', 'iceberg', 'clickhouse'],
    time: { from: 'now-1h', to: 'now' },
    timepicker: { refresh_intervals: ['5s', '10s', '30s', '1m', '5m'] },
    timezone: 'browser',
    title: 'O_Rabbit Lakehouse Control Plane Dashboard',
    uid: 'orabbit-control-plane',
    version: 1,
  };

  return JSON.stringify(dashboard, null, 2);
}
