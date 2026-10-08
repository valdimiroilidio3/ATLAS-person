import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Surface({
  children,
  className,
  interactive = false,
  padding = true,
  ...props
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  padding?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        'rounded-lg border border-border bg-surface shadow-card',
        interactive && 'transition-colors duration-200 hover:border-border-strong hover:bg-[#17171a] cursor-pointer',
        padding && 'p-5 sm:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-5', className)}>
      <div className="space-y-1.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description && <p className="text-sm text-text-2 max-w-xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
