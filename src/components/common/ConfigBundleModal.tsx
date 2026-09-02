import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Download, Upload, FileCode, CheckCircle2, Copy } from 'lucide-react';
import { useToast } from './Toast';
import { useQuery } from '@tanstack/react-query';
import { fetchJobs } from '@/api/jobs';
import { fetchConnections } from '@/api/connections';
import { exportClusterConfigToYaml, downloadConfigFile } from '@/utils/configBundle';
import { terminalSound } from '@/utils/terminalSound';

interface ConfigBundleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConfigBundleModal: React.FC<ConfigBundleModalProps> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
  const { data: connections = [] } = useQuery({ queryKey: ['connections'], queryFn: fetchConnections });

  let schedules = [];
  try {
    const raw = localStorage.getItem('orabbit_cron_schedules');
    if (raw) schedules = JSON.parse(raw);
  } catch {}

  let alerts = {};
  try {
    const raw = localStorage.getItem('orabbit_alert_webhooks');
    if (raw) alerts = JSON.parse(raw);
  } catch {}

  const configJson = exportClusterConfigToYaml(jobs, connections, schedules, alerts);

  const handleDownload = () => {
    downloadConfigFile(configJson, `orabbit-cluster-config-${Date.now()}.json`);
    terminalSound.playSuccess();
    toast.success('Downloaded cluster configuration bundle!');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(configJson);
    terminalSound.playSuccess();
    toast.success('Configuration JSON copied to clipboard!');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cluster Configuration Manifest Bundle"
      subtitle="Export or sync jobs, connections, schedules, and alert webhooks"
      maxWidth="xl"
    >
      <div className="space-y-4 font-mono text-xs">
        <div className="p-3 bg-[#020504] rounded-lg border border-surface-border font-mono text-xs text-emerald-400 max-h-72 overflow-y-auto">
          <pre className="text-emerald-300 whitespace-pre-wrap">{configJson}</pre>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-surface-border">
          <Button
            variant="secondary"
            size="sm"
            icon={Copy}
            onClick={handleCopy}
          >
            Copy JSON
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="cyber"
              size="sm"
              icon={Download}
              onClick={handleDownload}
            >
              Export Manifest File
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
