import { useEffect, useRef, useState } from 'react';
import { formatCurrency, formatSignedCurrency } from '../utils/format';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Smoothly interpolates a numeric value on change; renders formatted currency. */
export function AnimatedNumber({
  value,
  signed = false,
  className,
  style,
  durationMs = 500,
}: {
  value: number;
  signed?: boolean;
  className?: string;
  style?: React.CSSProperties;
  durationMs?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;

    if (prefersReducedMotion()) {
      setDisplay(to);
      fromRef.current = to;
      return;
    }

    const start = performance.now();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = easeOutExpo(t);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  const formatted = signed ? formatSignedCurrency(display) : formatCurrency(display);

  return (
    <span className={className} style={{ ...style, fontVariantNumeric: 'tabular-nums' }}>
      {formatted}
    </span>
  );
}
