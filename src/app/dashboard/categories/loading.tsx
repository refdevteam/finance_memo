import { Skeleton } from "@/components/ui/skeleton"

export default function CategoriesLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      {/* Tabs Switcher and Search bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <div className="w-full md:w-80 relative">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      </div>

      {/* Categories Grid Skeletons */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4 pt-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div 
            key={i} 
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-neutral-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center space-y-3"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-4 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
