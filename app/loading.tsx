import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="py-10 space-y-8">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-1/2 max-w-sm" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-56" />
    </div>
  );
}
