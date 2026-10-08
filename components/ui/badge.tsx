import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/atlas/constants';

const toneClasses: Record<Tone, string> = {
  success: 'text-success/90 border-success/25 bg-success/10',
  warning: 'text-warning/90 border-warning/25 bg-warning/10',
  error: 'text-error/90 border-error/25 bg-error/10',
  info: 'text-text-2 border-border bg-white/[0.03]',
  accent: 'text-accent border-accent/30 bg-accent/10',
  neutral: 'text-text-2 border-border bg-white/[0.03]',
};

const dotClasses: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-text-3',
  accent: 'bg-accent',
  neutral: 'bg-text-3',
};

export function Badge({
  tone = 'neutral',
  children,
  className,
  pulse = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em]',
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotClasses[tone], pulse && 'animate-dot-pulse')} />
      {children}
    </span>
  );
}

export function StatusChip({
  label,
  tone,
  pulse,
  className,
}: {
  label: string;
  tone: Tone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <Badge tone={tone} pulse={pulse} className={className}>
      {label}
    </Badge>
  );
}
