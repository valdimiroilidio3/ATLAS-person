'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<HTMLMotionProps<'button'>, 'size' | 'children'> & {
  children?: React.ReactNode;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-[#171004] hover:bg-accent-strong font-medium shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_24px_-8px_rgba(233,180,76,0.45)]',
  ghost: 'border border-border bg-transparent text-text hover:bg-white/[0.04] hover:border-border-strong',
  subtle: 'bg-surface2 text-text hover:bg-white/[0.06]',
  danger: 'bg-error/15 text-error border border-error/30 hover:bg-error/25',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] rounded-lg gap-1.5',
  md: 'h-[38px] px-4 text-sm rounded-lg gap-2',
  lg: 'h-11 px-5 text-[15px] rounded-xl gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'ghost', size = 'md', loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap transition-colors select-none',
        'focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </motion.button>
  );
});
