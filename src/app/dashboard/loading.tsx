import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border border-slate-100 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-zinc-900 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-32" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 border border-slate-100 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
        <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex justify-center pt-8">
            <Skeleton className="h-[200px] w-[200px] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
