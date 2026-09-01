import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface DataPoint {
  time: string;
  rowsPerSec: number;
  mbPerSec: number;
}

interface ThroughputChartProps {
  data: DataPoint[];
  title?: string;
  metric?: 'rows' | 'bytes' | 'both';
}

export const ThroughputChart: React.FC<ThroughputChartProps> = ({
  data,
  title = 'Real-time Ingestion Velocity',
  metric = 'both',
}) => {
  const chartData =
    data.length > 0
      ? data
      : [
          { time: '12:00', rowsPerSec: 0, mbPerSec: 0 },
          { time: '12:01', rowsPerSec: 15400, mbPerSec: 12.4 },
          { time: '12:02', rowsPerSec: 28900, mbPerSec: 24.1 },
          { time: '12:03', rowsPerSec: 42100, mbPerSec: 36.8 },
          { time: '12:04', rowsPerSec: 38700, mbPerSec: 32.5 },
          { time: '12:05', rowsPerSec: 45200, mbPerSec: 39.4 },
        ];

  return (
    <div className="p-4 sm:p-5 rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md shadow-terminal-sm space-y-3 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-surface-border/60 pb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300 font-mono flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#00ff66] animate-pulse" />
          <span>$ {title}</span>
        </h3>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          {(metric === 'rows' || metric === 'both') && (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-[#00ff66] shadow-[0_0_6px_#00ff66]" />
              Rows / sec
            </span>
          )}
          {(metric === 'bytes' || metric === 'both') && (
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="h-2 w-2 rounded-full bg-[#06b6d4] shadow-[0_0_6px_#06b6d4]" />
              MB / sec
            </span>
          )}
        </div>
      </div>

      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRows" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff66" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00ff66" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorMB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#112d20" />
            <XAxis dataKey="time" stroke="#235c40" tick={{ fontSize: 10, fill: '#34d399', fontFamily: 'monospace' }} />
            <YAxis
              stroke="#235c40"
              tick={{ fontSize: 10, fill: '#34d399', fontFamily: 'monospace' }}
              tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
            />
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
              labelStyle={{ color: '#00ff66', fontWeight: 'bold' }}
            />
            {(metric === 'rows' || metric === 'both') && (
              <Area
                type="monotone"
                dataKey="rowsPerSec"
                name="Rows/sec"
                stroke="#00ff66"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRows)"
              />
            )}
            {(metric === 'bytes' || metric === 'both') && (
              <Area
                type="monotone"
                dataKey="mbPerSec"
                name="MB/sec"
                stroke="#06b6d4"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorMB)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

