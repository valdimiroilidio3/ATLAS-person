'use client';

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const inputBase =
  'w-full rounded-lg border border-border bg-surface2 px-3 py-2 text-sm text-text placeholder:text-text-3 transition-colors focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(inputBase, className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(inputBase, 'min-h-[80px] resize-y', className)} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn(inputBase, 'appearance-none cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
});

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-text-2">{label}</span>
      {children}
      {hint && <span className="block text-xs text-text-3">{hint}</span>}
    </label>
  );
}
