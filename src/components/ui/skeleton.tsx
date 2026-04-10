export function Skeleton({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-200/80 ${className}`}
      {...props}
    />
  );
}

export function LibreDashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="space-y-3 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-32" />
        <div className="flex items-baseline gap-2 pt-1">
          <Skeleton className="h-12 w-28" />
          <Skeleton className="h-8 w-8" />
        </div>
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-surface p-4">
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="mb-3 h-3 w-full max-w-xs" />
        <Skeleton className="h-[220px] w-full rounded-lg" />
      </div>
    </div>
  );
}
