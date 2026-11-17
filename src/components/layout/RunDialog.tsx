import React, { useRef, useState } from 'react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Window } from '@/components/common/Window';
import rabbitPixel from '@/assets/rabbit/orabbit-pixel.svg';
import { NAV_ITEMS } from './Sidebar';

/**
 * The Start menu "Run…" dialog: type a page name (logs, workers) to open it,
 * or a run ID to open that run, like typing a program name in Windows.
 */
export const RunDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const open = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    const page = NAV_ITEMS.find((i) => i.label.toLowerCase() === q.toLowerCase() || i.to.replace(/\//g, ' ').trim() === q.toLowerCase());
    if (page) {
      navigate(page.to);
      onClose();
      return;
    }
    // Run IDs are hex; anything else is most likely a typo of a page name.
    if (/^[0-9a-f-]{6,}$/i.test(q)) {
      navigate(`/runs/${encodeURIComponent(q)}`);
      onClose();
      return;
    }
    setError(`Cannot find '${q}'. Type a page name (for example: logs, workers) or a run ID.`);
  };

  return (
    <div ref={dialogRef} onKeyDown={(e) => e.key === 'Escape' && onClose()} className="fixed inset-0 z-50 flex items-end justify-start p-3 pb-14" role="dialog" aria-modal="true" aria-labelledby="run-title">
      <div className="fixed inset-0" onClick={onClose} aria-hidden />
      <Window title="Run" titleId="run-title" onClose={onClose} className="relative w-full max-w-md shadow-[4px_4px_0_rgba(0,0,0,0.45)]" bodyClassName="p-3">
        <form onSubmit={open} className="space-y-3">
          <div className="flex items-start gap-3">
            <img src={rabbitPixel} alt="" className="h-8 w-8 [image-rendering:pixelated]" />
            <p className="text-[13px]">Type the name of a page or the ID of a run, and O_Rabbit will open it for you.</p>
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <span className="w-12">Open:</span>
            <input
              autoFocus
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError('');
              }}
              list="run-dialog-pages"
              className="bevel-in h-[26px] flex-1 bg-canvas px-2 font-mono text-xs focus:outline-none"
              aria-describedby={error ? 'run-error' : undefined}
            />
            <datalist id="run-dialog-pages">
              {NAV_ITEMS.map((i) => <option key={i.to} value={i.label} />)}
            </datalist>
          </label>
          {error && <p id="run-error" role="alert" className="text-xs font-bold text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="submit" className="min-w-[76px]">OK</Button>
            <Button variant="secondary" className="min-w-[76px]" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </Window>
    </div>
  );
};
