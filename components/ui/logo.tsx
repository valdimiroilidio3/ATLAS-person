import { cn } from '@/lib/utils';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="#e9b44c" />
      <circle cx="16" cy="16" r="4.2" fill="#0a0a0b" />
      <ellipse
        cx="16"
        cy="16"
        rx="11"
        ry="5.2"
        stroke="#0a0a0b"
        strokeWidth="1.8"
        transform="rotate(-24 16 16)"
      />
      <circle cx="25.4" cy="10.6" r="1.9" fill="#0a0a0b" />
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('h-6 w-6', markClassName)} />
      <span className="font-semibold tracking-[0.22em] text-[13px]">ATLAS</span>
    </span>
  );
}
