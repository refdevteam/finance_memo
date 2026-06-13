import { Skeleton } from "@/components/ui/skeleton"

export default function BudgetsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-36 rounded" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <Skeleton className="h-9 w-44 rounded-full" />
      </div>

      {/* Stats Summary Card Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-2 border-black dark:border-white p-6 rounded-xl bg-emerald-100 dark:bg-zinc-900 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)]">
        <div className="space-y-1">
          <Skeleton className="h-3.5 w-24 rounded bg-emerald-800/10" />
          <Skeleton className="h-7 w-36 rounded bg-emerald-800/10" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-3.5 w-24 rounded bg-emerald-800/10" />
          <Skeleton className="h-7 w-36 rounded bg-emerald-800/10" />
        </div>
        <div className="space-y-2 flex flex-col justify-center">
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-16 rounded bg-emerald-800/10" />
            <Skeleton className="h-3 w-10 rounded bg-emerald-800/10" />
          </div>
          <Skeleton className="h-2.5 w-full rounded bg-emerald-800/10" />
        </div>
      </div>

      {/* Search Input Skeleton */}
      <div className="relative">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* Budgets Grid Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-4 sm:p-5 rounded-2xl shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <Skeleton className="h-3 w-28 rounded" />
                <Skeleton className="h-3 w-10 rounded" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
