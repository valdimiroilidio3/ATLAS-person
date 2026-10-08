import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-14 px-6', className)}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface2">
        <Icon className="h-5 w-5 text-text-3" aria-hidden />
      </div>
      <h3 className="text-sm font-semibold text-text">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-text-2">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
