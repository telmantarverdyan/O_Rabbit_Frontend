import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStatus, fetchMetrics, fetchHealth } from '@/api/status';
import { getAuthToken, setAuthToken, getCustomBackendUrl, setCustomBackendUrl } from '@/api/client';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { ConfigBundleModal } from '@/components/common/ConfigBundleModal';
import { useToast } from '@/components/common/Toast';
import { terminalSound } from '@/utils/terminalSound';
import { generateGrafanaDashboardJSON } from '@/utils/grafanaDashboard';
import { Settings as SettingsIcon, Shield, Server, Activity, Save, RefreshCw, Terminal, Download } from 'lucide-react';

export const Settings: React.FC = () => {
  const toast = useToast();
  const [token, setToken] = useState(getAuthToken());
  const [backendUrl, setBackendUrl] = useState(getCustomBackendUrl());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isBundleOpen, setIsBundleOpen] = useState(false);

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['status'],
    queryFn: fetchStatus,
  });

  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
  });

  const { data: metrics, refetch: refetchMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['metrics'],
    queryFn: fetchMetrics,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthToken(token);
    setCustomBackendUrl(backendUrl);
    setSaveSuccess(true);
    refetchStatus();
    refetchHealth();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
            <SettingsIcon className="h-5 w-5 text-emerald-400" />
            Cluster Settings & Prometheus Telemetry
          </h2>
          <p className="text-xs text-emerald-500/80 mt-0.5">
            Configure API endpoints, Bearer authentication tokens, and inspect raw Prometheus scrape data.
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          onClick={() => setIsBundleOpen(true)}
        >
          Export Config Manifest
        </Button>
      </div>

      {/* Connection Form */}
      <form
        onSubmit={handleSave}
        className="p-6 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm space-y-4"
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <span>[CONTROL PLANE AUTHENTICATION]</span>
        </h3>

        <Input
          label="Backend Master Endpoint URL (Optional)"
          placeholder="http://localhost:8080 or http://185.2.103.18:9100"
          value={backendUrl}
          onChange={(e) => setBackendUrl(e.target.value)}
          helperText="Leave empty when running on the same origin or using Vite local proxy."
        />

        <Input
          label="HTTP Bearer Auth Token"
          type="password"
          placeholder="Enter ORABBIT_HTTP_AUTH_TOKEN..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          helperText="Required if the O_Rabbit master was started with an authentication token."
        />

        <div className="flex items-center justify-between pt-3 border-t border-surface-border">
          <div>
            {saveSuccess && (
              <span className="text-xs text-[#00ff66] font-mono glow-emerald">
                ✓ Cluster settings saved successfully!
              </span>
            )}
          </div>
          <Button variant="cyber" type="submit" icon={Save}>
            Save Configuration
          </Button>
        </div>
      </form>

      {/* Diagnostics / Prometheus Metrics & Grafana Dashboard */}
      <div className="p-6 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>[PROMETHEUS TELEMETRY FEED /metrics]</span>
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="cyber"
              size="sm"
              icon={Download}
              onClick={() => {
                const json = generateGrafanaDashboardJSON();
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'orabbit-grafana-dashboard.json';
                a.click();
                URL.revokeObjectURL(url);
                terminalSound.playSuccess();
                toast.success('Downloaded O_Rabbit Grafana Dashboard JSON template');
              }}
            >
              Export Grafana Dashboard
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={RefreshCw}
              onClick={() => refetchMetrics()}
              loading={loadingMetrics}
            >
              Scrape Now
            </Button>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-[#020504] border border-surface-border font-mono text-xs text-emerald-400 max-h-72 overflow-y-auto">
          {metrics ? (
            <pre className="text-emerald-400 whitespace-pre-wrap leading-relaxed">{metrics}</pre>
          ) : (
            <span className="text-emerald-700">[No Prometheus metrics stream received from /metrics endpoint]</span>
          )}
        </div>
      </div>

      <ConfigBundleModal
        isOpen={isBundleOpen}
        onClose={() => setIsBundleOpen(false)}
      />
    </div>
  );
};


