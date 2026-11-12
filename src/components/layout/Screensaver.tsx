import React, { useEffect, useRef, useState } from 'react';
import rabbitPixel from '@/assets/rabbit/orabbit-pixel.svg';

const KEY = 'orabbit_screensaver';
const IDLE_MS = 3 * 60_000;
const SIZE = 96;

/** Opt-in (per browser): a monitoring console must never cover live data unasked. */
export function useScreensaverSetting(): [boolean, (on: boolean) => void] {
  const read = () => {
    try {
      return localStorage.getItem(KEY) === 'on';
    } catch {
      return false;
    }
  };
  const [on, setOn] = useState(read);
  const set = (v: boolean) => {
    setOn(v);
    try {
      localStorage.setItem(KEY, v ? 'on' : 'off');
    } catch {
      // Storage blocked: the setting lasts until reload.
    }
  };
  return [on, set];
}

/**
 * After a few idle minutes the pixel rabbit bounces around a black screen,
 * like the old DVD logo. Any input dismisses it. With reduced motion it stays still.
 */
export const Screensaver: React.FC<{ enabled: boolean; preview: boolean; onPreviewEnd: () => void }> = ({ enabled, preview, onPreviewEnd }) => {
  const [idle, setIdle] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const active = preview || (enabled && idle);
  // The parent re-renders often (taskbar clock); a ref keeps the idle timer from
  // restarting on every render just because the callback is a new function.
  const onPreviewEndRef = useRef(onPreviewEnd);
  onPreviewEndRef.current = onPreviewEnd;

  // Idle detection.
  useEffect(() => {
    if (!enabled && !preview) return;
    let timer = setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      clearTimeout(timer);
      setIdle(false);
      if (preview) onPreviewEndRef.current();
      timer = setTimeout(() => setIdle(true), IDLE_MS);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'wheel', 'touchstart'] as const;
    // Ignore the click that started a preview.
    const arm = setTimeout(() => events.forEach((e) => window.addEventListener(e, wake, { passive: true })), 400);
    return () => {
      clearTimeout(timer);
      clearTimeout(arm);
      events.forEach((e) => window.removeEventListener(e, wake));
    };
  }, [enabled, preview]);

  // Bounce animation.
  useEffect(() => {
    if (!active) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let x = Math.random() * (window.innerWidth - SIZE);
    let y = Math.random() * (window.innerHeight - SIZE);
    let dx = 2.2;
    let dy = 1.7;
    let frame = 0;
    const step = () => {
      x += dx;
      y += dy;
      if (x <= 0 || x >= window.innerWidth - SIZE) dx = -dx;
      if (y <= 0 || y >= window.innerHeight - SIZE) dy = -dy;
      if (imgRef.current) imgRef.current.style.transform = `translate(${x}px, ${y}px)`;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active]);

  if (!active) return null;
  return (
    <div className="fixed inset-0 z-[100] cursor-none bg-black" aria-hidden>
      <img
        ref={imgRef}
        src={rabbitPixel}
        alt=""
        width={SIZE}
        height={SIZE}
        className="absolute left-0 top-0 [image-rendering:pixelated] motion-reduce:left-1/2 motion-reduce:top-1/2 motion-reduce:-translate-x-1/2 motion-reduce:-translate-y-1/2"
      />
    </div>
  );
};
