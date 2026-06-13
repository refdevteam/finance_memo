import { Skeleton } from "@/components/ui/skeleton"

export default function WalletsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      {/* Wallets Grid Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div 
            key={i} 
            className="border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] rounded-2xl p-4 sm:p-6 bg-white dark:bg-zinc-900 space-y-4"
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-7 w-36 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
