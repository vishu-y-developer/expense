import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

type Elevation = 'hero' | 'card';

export function GlassSurface({
  elevation = 'card',
  className = '',
  style,
  children,
}: {
  elevation?: Elevation;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const base = elevation === 'hero' ? 'glass-hero' : 'glass-card';
  return (
    <div className={`${base} ${className}`.trim()} style={style}>
      {children}
    </div>
  );
}

export function GlassButton({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variantClass = variant === 'primary' ? 'btn' : variant === 'danger' ? 'btn btn-danger' : 'btn btn-secondary';
  return (
    <button className={`${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  );
}

export function GlassIconButton({
  icon,
  size = 18,
  label,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; size?: number; label: string }) {
  return (
    <button className={`icon-btn ${className}`.trim()} aria-label={label} {...rest}>
      <Icon name={icon} size={size} />
    </button>
  );
}

export function GlassMetric({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: ReactNode;
  color?: string;
  icon?: IconName;
}) {
  return (
    <div className="stat-tile">
      <span className="label">{label}</span>
      <span className="stat-value" style={color ? { color } : undefined}>
        {icon && <Icon name={icon} size={14} style={{ marginRight: 5, verticalAlign: -2, opacity: 0.7 }} />}
        {value}
      </span>
    </div>
  );
}

/** Radial ring progress indicator — replaces a plain horizontal bar for hero-level stats. */
export function GlassProgress({
  percent,
  size = 84,
  strokeWidth = 9,
  value,
  caption,
  color = 'var(--accent)',
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  value: string;
  caption: string;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="radial-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--track)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 700ms var(--ease-out)' }}
        />
      </svg>
      <div className="radial-progress-inner">
        <span className="radial-progress-value">{value}</span>
        <span className="radial-progress-caption">{caption}</span>
      </div>
    </div>
  );
}
