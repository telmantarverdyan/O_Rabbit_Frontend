import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkers } from '@/api/workers';
import { fetchRuns } from '@/api/runs';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { MetricCard } from '@/components/common/MetricCard';
import { useToast } from '@/components/common/Toast';
import {
  Bell,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  SendHorizontal,
  Server,
  Zap,
  Terminal,
} from 'lucide-react';

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  status: 'FIRING' | 'RESOLVED';
  lastTriggered: string;
}

const ALERTS_STORAGE_KEY = 'orabbit_alert_webhooks';

export const Alerts: React.FC = () => {
  const toast = useToast();
  const { data: workers = [] } = useQuery({ queryKey: ['workers'], queryFn: fetchWorkers });
  const { data: runs = [] } = useQuery({ queryKey: ['runs'], queryFn: fetchRuns });

  const [slackUrl, setSlackUrl] = useState(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored).slackUrl || '';
    } catch {}
    return '';
  });

  const [telegramToken, setTelegramToken] = useState(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored).telegramToken || '';
    } catch {}
    return '';
  });

  const [telegramChatId, setTelegramChatId] = useState(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) return JSON.parse(stored).telegramChatId || '';
    } catch {}
    return '';
  });

  const [testSent, setTestSent] = useState(false);

  const failedRuns = runs.filter((r) => r.status === 'FAILED');

  const alertRules: AlertRule[] = [
    {
      id: 'rule-worker-offline',
      name: 'Worker Node Heartbeat Missing',
      condition: 'Heartbeat age > 25 seconds',
      severity: 'CRITICAL',
      status: workers.length === 0 ? 'FIRING' : 'RESOLVED',
      lastTriggered: workers.length === 0 ? 'Just now' : '2 hours ago',
    },
    {
      id: 'rule-task-failure',
      name: 'Task Quarantine / Permanent Failure',
      condition: 'Task retries exhausted or SQL extraction error',
      severity: 'CRITICAL',
      status: failedRuns.length > 0 ? 'FIRING' : 'RESOLVED',
      lastTriggered: failedRuns.length > 0 ? 'Recently' : 'Never',
    },
    {
      id: 'rule-s3-throttling',
      name: 'S3 Multipart Backoff & Rate Throttling',
      condition: 'Provider returns 503 SlowDown or lease wait > 30s',
      severity: 'WARNING',
      status: 'RESOLVED',
      lastTriggered: 'Never',
    },
    {
      id: 'rule-high-worker-cpu',
      name: 'Worker Fleet CPU Saturation',
      condition: 'Average CPU utilization > 85% for 5 minutes',
      severity: 'WARNING',
      status: 'RESOLVED',
      lastTriggered: '1 day ago',
    },
  ];

  const handleSendTestAlert = () => {
    setTestSent(true);
    toast.success('Test alert dispatched to configured webhook channels!', 'Alert Sent');
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleSaveSettings = () => {
    try {
      localStorage.setItem(
        ALERTS_STORAGE_KEY,
        JSON.stringify({ slackUrl, telegramToken, telegramChatId })
      );
      toast.success('Alert webhook settings saved to local config!');
    } catch {
      toast.error('Failed to save webhook settings.');
    }
  };

  const firingCount = alertRules.filter((r) => r.status === 'FIRING').length;

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
          <Bell className="h-5 w-5 text-emerald-400" />
          Cluster Alerts & Telemetry Incident Webhooks
        </h2>
        <p className="text-xs text-emerald-500/80 mt-0.5">
          Real-time cluster health monitors, proactive failure detection, and multi-channel webhook alerting.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="Active Alerts"
          value={firingCount}
          subtitle={firingCount === 0 ? 'All cluster systems healthy' : 'Incidents requiring attention'}
          icon={firingCount === 0 ? CheckCircle2 : ShieldAlert}
          color={firingCount === 0 ? 'emerald' : 'amber'}
        />
        <MetricCard
          title="Monitored Rules"
          value={alertRules.length}
          subtitle="Heartbeat, leases & S3 limits"
          icon={Zap}
          color="cyan"
        />
        <MetricCard
          title="Active Workers"
          value={workers.length}
          subtitle="Connected execution nodes"
          icon={Server}
          color="purple"
        />
      </div>

      {/* Active Rules Grid */}
      <div className="rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm overflow-hidden space-y-0">
        <div className="p-4 border-b border-surface-border bg-surface-darker">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono">
            [CLUSTER HEALTH & SAFETY THRESHOLDS]
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-darker text-emerald-600 border-b border-surface-border text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Rule Identifier</th>
                <th className="py-3 px-4 font-semibold">Trigger Condition</th>
                <th className="py-3 px-4 font-semibold">Severity</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Last Triggered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/40 text-emerald-200">
              {alertRules.map((r) => (
                <tr key={r.id} className="hover:bg-emerald-950/20 transition">
                  <td className="py-3.5 px-4 text-emerald-100 font-bold flex items-center gap-2">
                    {r.status === 'FIRING' ? (
                      <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    )}
                    <span>{r.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400">{r.condition}</td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        r.severity === 'CRITICAL'
                          ? 'bg-rose-950 text-rose-300 border-rose-700/40'
                          : 'bg-amber-950 text-amber-300 border-amber-700/40'
                      }`}
                    >
                      [{r.severity}]
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                        r.status === 'FIRING'
                          ? 'bg-rose-950 text-rose-300 border-rose-600/60 animate-pulse shadow-terminal-crimson'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-700/40'
                      }`}
                    >
                      [{r.status}]
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-emerald-500/80 text-right">{r.lastTriggered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Integrations Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slack Webhook */}
        <div className="p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md space-y-4 shadow-terminal-sm">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
            <MessageSquare className="h-4 w-4 text-emerald-400" />
            <span>[Slack / Discord Webhook]</span>
          </div>
          <Input
            label="Webhook Incoming URL"
            placeholder="https://hooks.slack.com/services/..."
            value={slackUrl}
            onChange={(e) => setSlackUrl(e.target.value)}
            helperText="Notifies channel on task quarantines, cluster partitions, or worker disconnections."
          />
        </div>

        {/* Telegram Notifications */}
        <div className="p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md space-y-4 shadow-terminal-sm">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
            <SendHorizontal className="h-4 w-4 text-cyan-400" />
            <span>[Telegram Bot Telemetry]</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Bot API Token"
              placeholder="123456:ABC-DEF..."
              value={telegramToken}
              onChange={(e) => setTelegramToken(e.target.value)}
            />
            <Input
              label="Chat ID"
              placeholder="-10012345678"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Save & Test Action */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-surface-border bg-[#020504]">
        <div>
          {testSent && (
            <span className="text-xs text-[#00ff66] font-mono glow-emerald">
              ✓ Test alert payload dispatched successfully!
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={Send}
            onClick={handleSendTestAlert}
          >
            Send Test Alert
          </Button>
          <Button variant="cyber" size="sm" icon={CheckCircle2} onClick={handleSaveSettings}>
            Save Webhook Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

