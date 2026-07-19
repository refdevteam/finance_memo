import { Skeleton } from "@/components/ui/skeleton"

export default function ReportsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-xl" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      {/* Summary Cards — card ke-3 span full di mobile agar tidak melebar aneh */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] rounded-2xl p-4 bg-white dark:bg-zinc-900 space-y-2 relative overflow-hidden min-h-[90px]">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-7 w-28 rounded" />
            <div className="absolute right-4 bottom-4">
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        ))}
        {/* Kartu ke-3: full-width di mobile, normal di md+ */}
        <div className="col-span-2 md:col-span-1 border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] rounded-2xl p-4 bg-white dark:bg-zinc-900 space-y-2 relative overflow-hidden min-h-[90px]">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-7 w-28 rounded" />
          <div className="absolute right-4 bottom-4">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>

      {/* AI Insights Card */}
      <div className="border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] rounded-2xl bg-white dark:bg-zinc-900 p-5 space-y-3">
        <div className="flex justify-between items-center">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full rounded" />
          <Skeleton className="h-3.5 w-11/12 rounded" />
          <Skeleton className="h-3.5 w-4/5 rounded" />
        </div>
      </div>

      {/* Charts — stack penuh di mobile, side-by-side di desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Pie Chart */}
        <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-zinc-900 space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-36 w-36 md:h-44 md:w-44 rounded-full" />
            <div className="w-full space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-3 rounded-full shrink-0" />
                  <Skeleton className="h-3 flex-1 rounded" />
                  <Skeleton className="h-3 w-16 rounded shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Bar Chart */}
        <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl p-4 md:p-6 bg-white dark:bg-zinc-900 space-y-4">
          <Skeleton className="h-5 w-40 rounded" />
          <div className="flex items-end justify-between h-36 md:h-44 pt-4 px-2 gap-2">
            {[40, 70, 55, 85, 35, 60].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="flex justify-between px-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-3 w-6 rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
