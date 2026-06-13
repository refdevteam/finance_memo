import { Skeleton } from "@/components/ui/skeleton"

export default function TransactionsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-52 rounded-lg" />
        <Skeleton className="h-4 w-96 max-w-full rounded-lg" />
      </div>

      {/* Tabs Switcher Skeleton */}
      <div className="flex border-b border-border gap-2">
        <Skeleton className="h-10 w-32 rounded-t-lg" />
        <Skeleton className="h-10 w-36 rounded-t-lg" />
      </div>

      {/* Filter Card Skeleton */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border-2 border-black dark:border-white space-y-4 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-6 w-32 rounded" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      {/* Transactions List Card Skeleton */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border-2 border-black dark:border-white overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)]">
        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3.5 min-w-0">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-1.5 min-w-0">
                  <Skeleton className="h-4 w-32 sm:w-48 rounded" />
                  <Skeleton className="h-3.5 w-24 sm:w-36 rounded" />
                </div>
              </div>
              <div className="flex items-center space-x-4 shrink-0">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
