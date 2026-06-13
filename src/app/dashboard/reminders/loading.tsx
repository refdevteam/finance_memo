import { Skeleton } from "@/components/ui/skeleton"

export default function RemindersLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Tabs Switcher and Search input */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="w-full md:w-80">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>

      {/* Reminders Grid Skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="border border-neutral-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/45 rounded-2xl p-4 sm:p-5 space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3.5 w-16 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>

            <Skeleton className="h-px w-full" />

            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-5.5 w-24 rounded" />
              </div>
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
