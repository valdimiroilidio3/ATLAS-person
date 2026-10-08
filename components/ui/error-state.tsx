import type { ReactNode } from 'react';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ErrorState({
  title,
  reason,
  action,
  icon: Icon = AlertTriangle,
  className,
}: {
  title: string;
  reason: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-error/25 bg-error/[0.06] p-4 flex items-start gap-3',
        className,
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{title}</p>
        <p className="mt-0.5 text-sm text-text-2">{reason}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
