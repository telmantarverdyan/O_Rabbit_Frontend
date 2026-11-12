import React from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

/** The small square buttons on a title bar. Decorative unless given an action. */
export const TitleButton: React.FC<{ label: string; onClick?: () => void; children: React.ReactNode }> = ({ label, onClick, children }) =>
  onClick ? (
    <button type="button" onClick={onClick} aria-label={label} className="bevel-out flex h-[18px] w-[20px] cursor-pointer items-center justify-center bg-card text-fg active:bevel-in">
      {children}
    </button>
  ) : (
    <span aria-hidden className="bevel-out flex h-[18px] w-[20px] items-center justify-center bg-card text-fg">
      {children}
    </span>
  );

interface WindowProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  /** Real close action (dialogs). Without it the close box is decorative. */
  onClose?: () => void;
  /** Show the minimize/maximize/close boxes (decorative unless onClose is set). */
  controls?: boolean;
  /** Buttons shown in a menu-bar row under the title. */
  menu?: React.ReactNode;
  /** Text in a sunken status bar at the bottom. */
  status?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  titleId?: string;
  children: React.ReactNode;
}

/** A Windows 9x window: raised gray frame, navy title bar, optional menu and status bars. */
export const Window: React.FC<WindowProps> = ({ title, icon, onClose, controls = true, menu, status, className, bodyClassName, titleId, children }) => (
  <section className={clsx('bevel-out flex min-w-0 flex-col bg-card p-[2px]', className)}>
    <header className="title-bar flex h-[26px] flex-shrink-0 items-center justify-between gap-2 px-1.5">
      <h2 id={titleId} className="flex min-w-0 items-center gap-1.5 truncate font-pixel text-sm font-semibold uppercase tracking-wide">
        {icon}
        <span className="truncate">{title}</span>
      </h2>
      {controls && (
        <div className="flex flex-shrink-0 gap-[2px]">
          <TitleButton label="Minimize"><span className="mt-[7px] block h-[2px] w-[8px] bg-fg" /></TitleButton>
          <TitleButton label="Maximize"><span className="block h-[8px] w-[9px] border border-t-2 border-fg" /></TitleButton>
          <span className="w-[2px]" />
          <TitleButton label="Close" onClick={onClose}><X className="h-3 w-3" strokeWidth={3} aria-hidden /></TitleButton>
        </div>
      )}
    </header>
    {menu && <div className="flex min-w-0 flex-wrap items-center gap-1 px-1 py-1">{menu}</div>}
    <div className={clsx('min-w-0 flex-1', bodyClassName)}>{children}</div>
    {status && <div className="bevel-thin mx-[2px] mb-[2px] mt-1 truncate px-2 py-0.5 text-xs text-fg-muted">{status}</div>}
  </section>
);
