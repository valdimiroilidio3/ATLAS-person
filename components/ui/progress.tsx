'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/atlas/constants';

const fillTone: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-text-3',
  neutral: 'bg-text-2',
};

export function ProgressBar({
  value,
  tone = 'accent',
  height = 6,
  className,
  delay = 0,
}: {
  value: number;
  tone?: Tone;
  height?: number;
  className?: string;
  delay?: number;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-white/[0.07]', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className={cn('h-full rounded-full', fillTone[tone])}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}
