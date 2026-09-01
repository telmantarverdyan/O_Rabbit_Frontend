import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJobs } from '@/api/jobs';
import { fetchRuns, submitJobRun } from '@/api/runs';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input, Select } from '@/components/common/Input';
import { useToast } from '@/components/common/Toast';
import { useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  Plus,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  ArrowRight,
  Trash2,
  Terminal,
} from 'lucide-react';

interface ScheduledJob {
  id: string;
  jobId: string;
  tableName: string;
  cronExpr: string;
  cronHuman: string;
  status: 'ACTIVE' | 'PAUSED';
  lastRunAt?: string;
  nextRunInMin: number;
}

const SCHEDULES_STORAGE_KEY = 'orabbit_cron_schedules';

const DEFAULT_SCHEDULES: ScheduledJob[] = [
  {
    id: 'sched-1',
    jobId: 'job-users',
    tableName: 'users',
    cronExpr: '*/5 * * * *',
    cronHuman: 'Every 5 minutes',
    status: 'ACTIVE',
    lastRunAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    nextRunInMin: 2,
  },
  {
    id: 'sched-2',
    jobId: 'job-orders',
    tableName: 'orders',
    cronExpr: '0 * * * *',
    cronHuman: 'Hourly at :00',
    status: 'ACTIVE',
    lastRunAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    nextRunInMin: 18,
  },
];

const CRON_PRESETS = [
  { label: 'Every 5 minutes (Real-time CDC)', value: '*/5 * * * *', human: 'Every 5 minutes' },
  { label: 'Every 15 minutes (Standard sync)', value: '*/15 * * * *', human: 'Every 15 minutes' },
  { label: 'Hourly (At minute 0)', value: '0 * * * *', human: 'Hourly' },
  { label: 'Daily at 02:00 AM UTC', value: '0 2 * * *', human: 'Daily at 02:00 UTC' },
];

import { fetchSchedules, saveSchedule, toggleSchedule, deleteSchedule, CronSchedule } from '@/api/schedules';

export const Schedules: React.FC = () => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
  const { data: runs = [] } = useQuery({ queryKey: ['runs'], queryFn: fetchRuns });
  const { data: schedules = [], isLoading, refetch } = useQuery({
    queryKey: ['schedules'],
    queryFn: fetchSchedules,
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedCron, setSelectedCron] = useState(CRON_PRESETS[1].value);
  const [customCron, setCustomCron] = useState('');

  const triggerMutation = useMutation({
    mutationFn: async (sched: CronSchedule) => {
      const targetJob = jobs.find((j) => j.id === sched.jobId) || jobs[0];
      if (!targetJob) throw new Error('No valid export job to execute');
      return submitJobRun(targetJob.id);
    },
    onSuccess: (run, sched) => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      toast.success(`Triggered scheduled sync for ${sched.name}!`, 'Run Started');
      navigate(`/runs/${run.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to trigger schedule');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return await toggleSchedule(id, enabled);
    },
    onSuccess: (_, { enabled }) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.info(`Schedule is now ${enabled ? 'ACTIVE' : 'PAUSED'}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await deleteSchedule(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success('Removed schedule');
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newSched: Partial<CronSchedule>) => {
      return await saveSchedule(newSched);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success(`Schedule added for ${saved.name} (${saved.cronExpr})`);
      setIsModalOpen(false);
    },
  });

  const handleToggleStatus = (id: string, currentEnabled: boolean) => {
    toggleMutation.mutate({ id, enabled: !currentEnabled });
  };

  const handleDeleteSchedule = (id: string, name: string) => {
    if (window.confirm(`Delete schedule ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    const job = jobs.find((j) => j.id === selectedJobId) || jobs[0];
    const expr = customCron.trim() || selectedCron;
    const preset = CRON_PRESETS.find((p) => p.value === expr);
    const tableName = job?.target_table || job?.options_json?.table || 'custom_table';

    createMutation.mutate({
      name: `${tableName} Ingestion Schedule`,
      jobId: job?.id || 'job-custom',
      cronExpr: expr,
      enabled: true,
    });
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-100 tracking-tight flex items-center gap-2 glow-emerald">
            <Clock className="h-5 w-5 text-emerald-400" />
            Ingestion Cron Schedules
          </h2>
          <p className="text-xs text-emerald-500/80 mt-0.5">
            Automate continuous lakehouse synchronization with cron-based triggers and High-Water Mark checkpoints.
          </p>
        </div>
        <Button
          variant="cyber"
          icon={Plus}
          size="sm"
          onClick={() => setIsModalOpen(true)}
        >
          Create Ingestion Schedule
        </Button>
      </div>

      {/* Schedules Table */}
      <div className="rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-surface-darker text-emerald-600 border-b border-surface-border text-[10px] uppercase">
              <tr>
                <th className="py-3 px-4 font-semibold">Target Table</th>
                <th className="py-3 px-4 font-semibold">Cron Frequency</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Last Synced</th>
                <th className="py-3 px-4 font-semibold">Next Execution</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-950/40 text-emerald-200">
              {schedules.map((s) => {
                const targetJob = jobs.find((j) => j.id === s.jobId);
                const tableName = targetJob?.target_table || targetJob?.options_json?.table || s.name;
                const preset = CRON_PRESETS.find((p) => p.value === s.cronExpr);

                return (
                  <tr key={s.id} className="hover:bg-emerald-950/20 transition">
                    <td className="py-3.5 px-4 text-emerald-100 font-bold flex items-center gap-2">
                      <Layers className="h-3.5 w-3.5 text-emerald-400" />
                      <div>
                        <span>{s.name}</span>
                        <span className="text-[10px] text-emerald-600 block font-normal">
                          Target: {tableName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-300 font-semibold">
                      {preset?.human || s.cronExpr}
                      <span className="text-[10px] text-emerald-600 block font-normal font-mono">
                        {s.cronExpr}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          s.enabled
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/40'
                            : 'bg-surface-darker text-emerald-700 border-surface-border'
                        }`}
                      >
                        [{s.enabled ? 'ACTIVE' : 'PAUSED'}]
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-emerald-500/80">
                      {s.lastRunAt ? new Date(s.lastRunAt).toLocaleTimeString() : 'Never'}
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400 font-semibold">
                      {s.nextRunAt ? new Date(s.nextRunAt).toLocaleTimeString() : 'Active'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={s.enabled ? Pause : Play}
                        onClick={() => handleToggleStatus(s.id, s.enabled)}
                      >
                        {s.enabled ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={RotateCcw}
                        loading={triggerMutation.isPending && triggerMutation.variables?.id === s.id}
                        onClick={() => triggerMutation.mutate(s)}
                      >
                        Trigger
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                        icon={Trash2}
                        onClick={() => handleDeleteSchedule(s.id, s.name)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Schedule */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Ingestion Cron"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4 font-mono text-xs">
          <Select
            label="Select Export Job"
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            options={
              jobs.length > 0
                ? jobs.map((j) => ({
                    label: `${j.target_table || j.options_json?.table || 'Job'} (#${j.id.slice(0, 8)})`,
                    value: j.id,
                  }))
                : [{ label: 'users (Sample Job)', value: 'sample' }]
            }
          />

          <Select
            label="Schedule Preset"
            value={selectedCron}
            onChange={(e) => {
              setSelectedCron(e.target.value);
              setCustomCron('');
            }}
            options={CRON_PRESETS.map((p) => ({
              label: p.label,
              value: p.value,
            }))}
          />

          <Input
            label="Custom Cron Expression (Optional)"
            placeholder="e.g. */30 * * * *"
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            helperText="Standard 5-field cron format (minute, hour, day, month, weekday)."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-surface-border">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="cyber" type="submit" icon={CheckCircle2}>
              Save Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

