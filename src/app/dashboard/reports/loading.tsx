import { Skeleton } from "@/components/ui/skeleton"

export default function ReportsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] rounded-2xl p-4 bg-white dark:bg-zinc-900 space-y-2 relative overflow-hidden">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-7 w-32 rounded" />
            <div className="absolute right-4 bottom-4">
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* AI Insights Card */}
      <div className="border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] rounded-xl bg-white dark:bg-zinc-900 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-11/12 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-8">
        <div className="col-span-1 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-zinc-900 space-y-4">
          <Skeleton className="h-5 w-36 rounded" />
          <div className="flex justify-center py-6">
            <Skeleton className="h-40 w-40 rounded-full" />
          </div>
        </div>
        <div className="col-span-1 border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-zinc-900 space-y-4">
          <Skeleton className="h-5 w-36 rounded" />
          <div className="flex items-end justify-between h-40 pt-4 px-4">
            <Skeleton className="h-16 w-8 rounded-t" />
            <Skeleton className="h-28 w-8 rounded-t" />
            <Skeleton className="h-20 w-8 rounded-t" />
            <Skeleton className="h-32 w-8 rounded-t" />
            <Skeleton className="h-12 w-8 rounded-t" />
            <Skeleton className="h-24 w-8 rounded-t" />
          </div>
        </div>
      </div>
    </div>
  )
}
