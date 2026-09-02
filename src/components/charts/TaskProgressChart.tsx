import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TaskProgressChartProps {
  succeeded: number;
  running: number;
  failed: number;
  pending: number;
}

export const TaskProgressChart: React.FC<TaskProgressChartProps> = ({
  succeeded,
  running,
  failed,
  pending,
}) => {
  const data = [
    { name: 'Succeeded', value: succeeded, color: '#00ff66' },
    { name: 'Running', value: running, color: '#06b6d4' },
    { name: 'Pending', value: pending, color: '#f59e0b' },
    { name: 'Failed', value: failed, color: '#ef4444' },
  ].filter((d) => d.value > 0);

  const total = succeeded + running + failed + pending;

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-surface-border/60 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-1.5">
          <span className="text-emerald-400">$</span>
          <span>Task Partition State</span>
        </h3>
        <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
          Total: {total}
        </span>
      </div>

      <div className="relative h-56 w-full flex items-center justify-center">
        {total === 0 ? (
          <div className="text-center text-emerald-600 text-xs font-mono">
            [No active tasks planned]
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="#040907"
                  strokeWidth={3}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#050c08',
                    borderColor: '#10b981',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)',
                    color: '#a3e5c7',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold font-mono text-emerald-300 tracking-tight glow-emerald">
                {total.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-500/80 font-mono">
                {total > 0 ? `${((succeeded / total) * 100).toFixed(0)}% OK` : 'TASKS'}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-3 border-t border-surface-border/60">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00ff66] shadow-[0_0_4px_#00ff66]" /> Succeeded: {succeeded}
        </div>
        <div className="flex items-center gap-1.5 text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#06b6d4] shadow-[0_0_4px_#06b6d4]" /> Running: {running}
        </div>
        <div className="flex items-center gap-1.5 text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" /> Pending: {pending}
        </div>
        <div className="flex items-center gap-1.5 text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444] shadow-[0_0_4px_#ef4444]" /> Failed: {failed}
        </div>
      </div>
    </div>
  );
};

