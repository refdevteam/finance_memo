import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsLoading() {
  return (
    <div className="p-4 md:p-8 space-y-8 pb-28 md:pb-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-80 rounded-lg" />
      </div>

      {/* Settings Sections stack */}
      <div className="max-w-2xl space-y-6">
        {/* Section 1: Profil Pengguna */}
        <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/40 p-5 sm:p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-border">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32 rounded" />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Section 2: Preferensi Tampilan */}
        <div className="border border-neutral-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/40 p-5 sm:p-6 space-y-5">
          <div className="flex items-center space-x-3 pb-3 border-b border-border">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-40 rounded" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Section 3: Hapus Akun */}
        <div className="border border-rose-100 dark:border-rose-950/30 rounded-2xl bg-white dark:bg-zinc-900/40 p-5 sm:p-6 space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-rose-100 dark:border-rose-950/20">
            <Skeleton className="h-5 w-5 rounded bg-rose-500/10" />
            <Skeleton className="h-5 w-28 rounded bg-rose-500/10" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-10 w-36 rounded-xl bg-rose-500/10" />
          </div>
        </div>
      </div>
    </div>
  )
}
