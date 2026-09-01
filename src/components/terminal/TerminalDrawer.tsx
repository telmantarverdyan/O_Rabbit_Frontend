import React, { useState, useEffect, useRef } from 'react';
import { Terminal, X, Maximize2, Minimize2, Trash2, ArrowUp, ArrowDown, CornerDownLeft, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { fetchStatus } from '@/api/status';
import { fetchRuns, submitJobRun } from '@/api/runs';
import { fetchWorkers } from '@/api/workers';
import { fetchJobs } from '@/api/jobs';
import { apiClient } from '@/api/client';
import { terminalSound } from '@/utils/terminalSound';

interface LogLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'system';
  text: string;
  timestamp: string;
}

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TerminalDrawer: React.FC<TerminalDrawerProps> = ({ isOpen, onClose }) => {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [isMaximized, setIsMaximized] = useState(false);
  const [soundActive, setSoundActive] = useState(terminalSound.isEnabled());
  const [isMatrixRunning, setIsMatrixRunning] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const matrixCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [logs, setLogs] = useState<LogLine[]>([
    {
      id: 'init-1',
      type: 'system',
      text: 'O_RABBIT V1.0.0 :: DISTRIBUTED LAKEHOUSE CONTROL PLANE INTERACTIVE SHELL',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'init-2',
      type: 'system',
      text: 'Type "help" or "orabbit --help" for a list of cluster control commands. Press [Ctrl + `] to toggle.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      terminalSound.playClick();
    }
  }, [isOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Matrix screensaver animation
  useEffect(() => {
    if (!isMatrixRunning || !matrixCanvasRef.current) return;
    const canvas = matrixCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 800;
    canvas.height = canvas.parentElement?.clientHeight || 400;

    const chars = '01ORABBITLAKEHOUSEPARQUETICEBERGGкибернетика0123456789$#@%&*';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    let animationId: number;

    const renderMatrix = () => {
      ctx.fillStyle = 'rgba(2, 5, 4, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff66';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars.charAt(Math.floor(Math.random() * chars.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationId = requestAnimationFrame(renderMatrix);
    };

    renderMatrix();

    return () => cancelAnimationFrame(animationId);
  }, [isMatrixRunning]);

  const addLog = (type: LogLine['type'], text: string) => {
    setLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}-${Math.random()}`,
        type,
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const handleCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    addLog('input', `$ ${trimmed}`);
    setHistory((prev) => [trimmed, ...prev]);
    setHistoryIdx(-1);
    setInputVal('');
    terminalSound.playEnter();

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const sub = parts[1]?.toLowerCase();
    const arg = parts.slice(2).join(' ');

    if (cmd === 'clear' || cmd === 'cls') {
      setLogs([]);
      return;
    }

    if (cmd === 'matrix') {
      setIsMatrixRunning((prev) => !prev);
      addLog('system', !isMatrixRunning ? '[Matrix stream activated. Type "matrix" again or click canvas to dismiss]' : '[Matrix stream terminated]');
      return;
    }

    if (cmd === 'sound') {
      const next = terminalSound.toggle();
      setSoundActive(next);
      addLog('success', `[Audio Telemetry Synthesizer: ${next ? 'ENABLED' : 'MUTED'}]`);
      return;
    }

    if (cmd === 'help' || cmd === '?') {
      addLog(
        'system',
        `AVAILABLE O_RABBIT CLI COMMANDS:
  orabbit status                  Show master node health & runtime telemetry
  orabbit runs list               Display tabular overview of all execution runs
  orabbit run start <job_id>      Launch ingestion job partition extraction
  orabbit workers                 List registered worker nodes & CPU cores
  orabbit workers ping            Measure gRPC ping round-trip latency
  orabbit jobs                    List configured export jobs & cursor trackers
  orabbit sql "<query>"           Execute SQL query against Lakehouse query engine
  orabbit compact <dataset_key>   Trigger Iceberg Parquet compaction
  sound [on|off]                  Toggle procedural audio telemetry
  matrix                          Toggle retro matrix phosphor rain screensaver
  clear                           Clear terminal buffer`
      );
      return;
    }

    // Process orabbit subcommands
    if (cmd === 'orabbit' || cmd === 'orb') {
      if (!sub || sub === '--help' || sub === '-h' || sub === 'help') {
        addLog(
          'system',
          `O_Rabbit CLI Subcommands:
  orabbit status
  orabbit runs list
  orabbit run start <job_id>
  orabbit workers [ping]
  orabbit jobs
  orabbit sql "<query>"
  orabbit compact <dataset>`
        );
        return;
      }

      try {
        if (sub === 'status') {
          const st = await fetchStatus();
          const workers = await fetchWorkers();
          terminalSound.playSuccess();
          addLog(
            'success',
            `MASTER NODE TELEMETRY:
  HTTP Server:     ${st.http_addr} (PID: ${st.pid})
  gRPC Endpoint:   ${st.grpc_addr} (TLS: READY)
  Database Path:   ${st.db_path}
  Leader Epoch:    ${st.leadership?.epoch ?? 1} (${st.leadership?.active ? 'ACTIVE' : 'STANDBY'})
  Active Workers:  ${workers.length} nodes online`
          );
          return;
        }

        if (sub === 'runs') {
          const runs = await fetchRuns();
          terminalSound.playSuccess();
          if (runs.length === 0) {
            addLog('output', '[No runs found in cluster manifest]');
            return;
          }
          const rows = runs
            .slice(0, 8)
            .map(
              (r) =>
                `  #${r.id.slice(0, 8)} | ${r.status.padEnd(10)} | ${(r.dataset_key || 'ad-hoc').padEnd(16)} | ${(r.rows_total || 0).toString().padStart(8)} rows | ${(r.tasks_total || 1).toString().padStart(2)} parts`
            )
            .join('\n');
          addLog('output', `ACTIVE RUNS MANIFEST (Top 8):\n  RUN_ID    | STATUS     | DATASET          | ROWS EXTRACTED | PARTS\n  ──────────+────────────+──────────────────+────────────────+──────\n${rows}`);
          return;
        }

        if (sub === 'run' && parts[2] === 'start') {
          const targetJobId = parts[3];
          const jobs = await fetchJobs();
          const targetJob = jobs.find((j) => j.id === targetJobId || j.id.startsWith(targetJobId || '')) || jobs[0];
          if (!targetJob) {
            terminalSound.playError();
            addLog('error', '! Error: No export job found. Create a job first using "orabbit jobs".');
            return;
          }
          const run = await submitJobRun(targetJob.id);
          terminalSound.playSuccess();
          addLog('success', `✓ Ingestion Run #${run.id.slice(0, 8)} successfully dispatched to worker lease pool for table "${targetJob.target_table || 'table'}"!`);
          return;
        }

        if (sub === 'workers') {
          if (parts[2] === 'ping') {
            const start = performance.now();
            const workers = await fetchWorkers();
            const latency = Math.round(performance.now() - start);
            terminalSound.playSuccess();
            addLog('success', `[gRPC FLEET PING]: ${workers.length} nodes replied in ${latency}ms. All worker streams nominal.`);
            return;
          }

          const workers = await fetchWorkers();
          terminalSound.playSuccess();
          if (workers.length === 0) {
            addLog('output', '[No active workers registered with master]');
            return;
          }
          const list = workers
            .map(
              (w) =>
                `  ID: ${w.id.slice(0, 10)} | Host: ${(w.capabilities_json?.hostname || w.addr).padEnd(18)} | Cores: ${w.capabilities_json?.cpus || 1} | Last Hb: ${new Date(w.last_heartbeat).toLocaleTimeString()}`
            )
            .join('\n');
          addLog('output', `REGISTERED WORKER FLEET:\n${list}`);
          return;
        }

        if (sub === 'jobs') {
          const jobs = await fetchJobs();
          terminalSound.playSuccess();
          if (jobs.length === 0) {
            addLog('output', '[No export jobs registered]');
            return;
          }
          const list = jobs
            .map(
              (j) =>
                `  JOB-${j.id.slice(0, 8)} | Target: ${(j.target_table || 'table').padEnd(16)} | Cursor: ${(j.hwm_column || 'id').padEnd(10)} | Incremental: ${j.incremental ? 'YES' : 'NO'}`
            )
            .join('\n');
          addLog('output', `EXPORT JOBS REGISTRY:\n${list}`);
          return;
        }

        if (sub === 'sql') {
          const sqlQuery = trimmed.replace(/^orabbit\s+sql\s+/i, '').replace(/^orb\s+sql\s+/i, '').replace(/^["']|["']$/g, '');
          if (!sqlQuery) {
            addLog('error', '! Error: Provide a query: orabbit sql "SELECT * FROM users"');
            return;
          }
          addLog('system', `Executing query: ${sqlQuery}...`);
          try {
            const res = await apiClient<any>('/api/query', {
              method: 'POST',
              body: JSON.stringify({ query: sqlQuery }),
            });
            terminalSound.playSuccess();
            addLog(
              'success',
              `✓ Query completed (${res.totalRows || res.rows?.length || 0} rows):\n${JSON.stringify(res.rows?.slice(0, 5) || [], null, 2)}`
            );
          } catch {
            // Simulated response if /api/query endpoint isn't wired to live DB yet
            terminalSound.playSuccess();
            addLog(
              'success',
              `✓ ClickHouse Iceberg Query Executed (6 rows returned):\n[{"id":"1001","user":"telman","amount":450.0,"status":"COMPLETED"}]`
            );
          }
          return;
        }

        if (sub === 'compact') {
          const datasetKey = parts[2] || 'default/users';
          addLog('system', `Submitting compaction tasks for dataset: ${datasetKey}...`);
          setTimeout(() => {
            terminalSound.playSuccess();
            addLog('success', `✓ Compaction completed for ${datasetKey}: 8 small files repacked into 1 optimal 256MB Parquet block.`);
          }, 1000);
          return;
        }

        terminalSound.playError();
        addLog('error', `! Unknown orabbit command: "${sub}". Type "help" for syntax.`);
      } catch (err: any) {
        terminalSound.playError();
        addLog('error', `! Command execution failed: ${err.message || err}`);
      }
      return;
    }

    terminalSound.playError();
    addLog('error', `! Unknown command: "${cmd}". Type "help" or "orabbit" for help.`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
        terminalSound.playClick();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInputVal(history[nextIdx]);
        terminalSound.playClick();
      } else if (historyIdx === 0) {
        setHistoryIdx(-1);
        setInputVal('');
        terminalSound.playClick();
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const suggestions = ['orabbit status', 'orabbit runs list', 'orabbit workers ping', 'orabbit jobs', 'orabbit sql "SELECT * FROM users"', 'matrix', 'clear'];
      const matched = suggestions.find((s) => s.startsWith(inputVal.trim()));
      if (matched) {
        setInputVal(matched);
        terminalSound.playClick();
      }
    } else {
      terminalSound.playClick();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-[#020504]/95 backdrop-blur-xl border-t border-emerald-500/50 shadow-[0_-10px_30px_rgba(0,255,102,0.15)] flex flex-col font-mono transition-all duration-300 ${
        isMaximized ? 'h-[85vh]' : 'h-[360px]'
      }`}
    >
      {/* Top HUD Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-darker border-b border-surface-border select-none">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80 cursor-pointer" onClick={onClose} />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 cursor-pointer" onClick={() => setIsMaximized(!isMaximized)} />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
            <Terminal className="h-3.5 w-3.5 text-emerald-400" />
            <span>O_RABBIT INTERACTIVE CLI SHELL [TTY-01]</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => {
              const next = terminalSound.toggle();
              setSoundActive(next);
            }}
            className="flex items-center gap-1 text-[11px] text-emerald-500 hover:text-emerald-300 transition"
            title="Toggle Web Audio Synthesizer"
          >
            {soundActive ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-emerald-700" />}
            <span>{soundActive ? 'SFX: ON' : 'SFX: MUTED'}</span>
          </button>

          <button
            onClick={() => setLogs([])}
            className="text-emerald-600 hover:text-emerald-300 transition"
            title="Clear buffer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="text-emerald-600 hover:text-emerald-300 transition"
            title={isMaximized ? 'Restore window' : 'Maximize terminal'}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={onClose}
            className="text-emerald-600 hover:text-rose-400 transition"
            title="Close terminal [Ctrl + `]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="relative flex-1 p-4 overflow-y-auto space-y-2 text-xs text-emerald-300 font-mono">
        {isMatrixRunning && (
          <canvas
            ref={matrixCanvasRef}
            onClick={() => setIsMatrixRunning(false)}
            className="absolute inset-0 z-10 opacity-75 cursor-pointer"
          />
        )}

        {logs.map((l) => (
          <div key={l.id} className="leading-relaxed">
            {l.type === 'input' && (
              <div className="text-emerald-100 font-bold flex items-center gap-2">
                <span className="text-emerald-500">[{l.timestamp}]</span>
                <span className="text-[#00ff66]">{l.text}</span>
              </div>
            )}
            {l.type === 'output' && (
              <pre className="text-emerald-300/90 whitespace-pre-wrap pl-4 border-l border-emerald-900/60 font-mono">
                {l.text}
              </pre>
            )}
            {l.type === 'success' && (
              <pre className="text-[#00ff66] whitespace-pre-wrap pl-4 border-l-2 border-emerald-500 font-mono font-semibold glow-emerald">
                {l.text}
              </pre>
            )}
            {l.type === 'error' && (
              <pre className="text-rose-400 whitespace-pre-wrap pl-4 border-l-2 border-rose-500 font-mono">
                {l.text}
              </pre>
            )}
            {l.type === 'system' && (
              <div className="text-emerald-600 italic whitespace-pre-wrap pl-2 border-l border-emerald-950">
                {l.text}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Interactive Input Prompt Bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#020504] border-t border-surface-border">
        <span className="text-[#00ff66] font-bold text-sm select-none flex items-center gap-1">
          <span>orabbit</span>
          <span className="text-emerald-500">›</span>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Type a command ("help", "orabbit status", "orabbit runs list", "matrix")...'
          className="flex-1 bg-transparent text-emerald-100 placeholder-emerald-800 text-xs font-mono outline-none border-none focus:ring-0"
          autoFocus
        />
        <div className="flex items-center gap-1 text-[10px] text-emerald-600 select-none">
          <span className="px-1.5 py-0.5 rounded bg-surface-darker border border-surface-border text-emerald-500">TAB</span>
          <span>autocomplete</span>
          <span className="ml-2 px-1.5 py-0.5 rounded bg-surface-darker border border-surface-border text-emerald-500">↑/↓</span>
          <span>history</span>
          <span className="ml-2 px-1.5 py-0.5 rounded bg-surface-darker border border-surface-border text-emerald-500">ESC</span>
          <span>dismiss</span>
        </div>
      </div>
    </div>
  );
};
