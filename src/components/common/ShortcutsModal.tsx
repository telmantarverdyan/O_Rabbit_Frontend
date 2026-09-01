import React from 'react';
import { Modal } from './Modal';
import { Keyboard, Terminal, Search, Play, RefreshCw, Layers } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: 'Ctrl + ` / ~', desc: 'Toggle interactive hacker CLI shell drawer' },
    { key: 'Cmd + K / Ctrl + K', desc: 'Open fuzzy command palette' },
    { key: '?', desc: 'Show keyboard shortcuts cheat-sheet HUD' },
    { key: 'G O', desc: 'Jump to Overview Dashboard' },
    { key: 'G R', desc: 'Jump to Ingestion Runs' },
    { key: 'G J', desc: 'Jump to Export Jobs' },
    { key: 'G Q', desc: 'Jump to SQL Query Console' },
    { key: 'G L', desc: 'Jump to Pipeline Lineage' },
    { key: 'G D', desc: 'Jump to Datasets' },
    { key: 'G W', desc: 'Jump to Worker Fleet' },
    { key: 'G S', desc: 'Jump to Cron Schedules' },
    { key: 'G M', desc: 'Jump to Maintenance' },
    { key: 'ESC', desc: 'Close any active modal, palette, or shell' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts & Vim Navigation"
      subtitle="Hands-on-keyboard control plane accelerators"
      maxWidth="md"
    >
      <div className="space-y-3 font-mono text-xs">
        <div className="grid grid-cols-1 gap-2">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-2.5 rounded-lg bg-[#020504] border border-surface-border"
            >
              <span className="text-emerald-400">{s.desc}</span>
              <kbd className="px-2 py-1 rounded bg-surface-darker border border-emerald-800/40 text-emerald-200 text-[11px] font-bold">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
