'use client'

import { useState, useTransition } from 'react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'
import { deleteCategory } from '@/actions/categories'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CategoryBadge } from '@/components/dashboard/CategoryBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon?: string
  color?: string
  user_id?: string | null
}

interface CategoriesClientProps {
  initialCategories: Category[]
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()

  // Filter categories by type and search query
  const filteredCategories = initialCategories.filter((cat) => {
    const matchesTab = cat.type === activeTab
    const matchesSearch = cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  // Action to handle deletion of custom category
  const handleDelete = (id: string, name: string) => {
    startTransition(async () => {
      try {
        await deleteCategory(id)
        toast.success(`Kategori "${name}" berhasil dihapus.`)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Gagal menghapus kategori.')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Flutter-like Chip Tabs at the top */}
      <div className="flex items-center space-x-3 overflow-x-auto py-2 -mx-4 px-4 scrollbar-none">
        {/* Expense Chip */}
        <button
          onClick={() => setActiveTab('expense')}
          className={cn(
            "flex items-center space-x-2.5 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-300 transform active:scale-95 shadow-sm focus:outline-none shrink-0",
            activeTab === 'expense'
              ? "bg-rose-500 border-rose-600 text-white shadow-rose-200 dark:shadow-none ring-4 ring-rose-500/10 scale-105"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          )}
        >
          <LucideIcons.TrendingDown className={cn(
            "h-4 w-4 transition-transform duration-300",
            activeTab === 'expense' ? "rotate-0 scale-110" : "-rotate-45"
          )} />
          <span>Pengeluaran</span>
          {activeTab === 'expense' && (
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          )}
        </button>

        {/* Income Chip */}
        <button
          onClick={() => setActiveTab('income')}
          className={cn(
            "flex items-center space-x-2.5 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-300 transform active:scale-95 shadow-sm focus:outline-none shrink-0",
            activeTab === 'income'
              ? "bg-emerald-500 border-emerald-600 text-white shadow-emerald-200 dark:shadow-none ring-4 ring-emerald-500/10 scale-105"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80"
          )}
        >
          <LucideIcons.TrendingUp className={cn(
            "h-4 w-4 transition-transform duration-300",
            activeTab === 'income' ? "rotate-0 scale-110" : "rotate-45"
          )} />
          <span>Pemasukan</span>
          {activeTab === 'income' && (
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          )}
        </button>
      </div>

      {/* Modern Search bar */}
      <div className="relative">
        <LucideIcons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
        <Input
          type="text"
          placeholder={`Cari kategori ${activeTab === 'expense' ? 'pengeluaran' : 'pemasukan'}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 py-5 rounded-2xl bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 focus-visible:ring-emerald-500 transition-all shadow-sm text-sm"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-full text-slate-400 transition-colors"
          >
            <LucideIcons.X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 transition-all">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <LucideIcons.Inbox className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">Tidak Ada Kategori</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
            {searchQuery 
              ? `Tidak ditemukan kategori dengan kata kunci "${searchQuery}"`
              : `Belum ada kategori untuk tipe ${activeTab === 'expense' ? 'pengeluaran' : 'pemasukan'}.`}
          </p>
          {searchQuery && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSearchQuery('')}
              className="mt-4 rounded-xl text-xs"
            >
              Reset Pencarian
            </Button>
          )}
        </div>
      )}

      {/* Mobile list view */}
      <div className="block sm:hidden space-y-2.5">
        {filteredCategories.map((cat) => {
          // Dynamic icon loading from Lucide
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Icon = (LucideIcons as any)[cat.icon || 'Tag'] || LucideIcons.Tag
          const isCustom = !!cat.user_id

          return (
            <div 
              key={cat.id} 
              className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm active:scale-[0.99] transition-all duration-200"
            >
              <div className="flex items-center space-x-3.5">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center border shadow-sm transition-transform active:scale-95"
                  style={{ 
                    backgroundColor: `${cat.color}12`, // 12% opacity
                    color: cat.color || '#64748b',
                    borderColor: `${cat.color}25` // 25% opacity
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm block">
                    {cat.name}
                  </span>
                  <span className={cn(
                    "inline-block text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-wider font-extrabold mt-0.5",
                    isCustom 
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" 
                      : "bg-slate-50 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400"
                  )}>
                    {isCustom ? 'Kustom' : 'Sistem'}
                  </span>
                </div>
              </div>

              {/* Action area */}
              <div className="flex items-center space-x-2">
                {isCustom && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8.5 w-8.5 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all shrink-0 active:scale-90"
                        disabled={isPending}
                      >
                        <LucideIcons.Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[90%] sm:max-w-[400px] rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                          Apakah Anda yakin ingin menghapus kategori kustom <strong>&quot;{cat.name}&quot;</strong>? Transaksi yang sudah menggunakan kategori ini mungkin akan dipindahkan ke kategori default.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                          Batal
                        </AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop Grid View */}
      <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredCategories.map((cat) => {
          const isCustom = !!cat.user_id
          return (
            <div 
              key={cat.id} 
              className="group relative p-4.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center text-center min-h-[120px]"
            >
              {/* Custom item delete button (absolute position corner) */}
              {isCustom && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 active:scale-95"
                        disabled={isPending}
                      >
                        <LucideIcons.Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Kategori?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Apakah Anda yakin ingin menghapus kategori kustom <strong>&quot;{cat.name}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl">Batal</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                        >
                          Hapus
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}

              <CategoryBadge 
                name={cat.name} 
                iconName={cat.icon} 
                color={cat.color} 
                className="scale-110 mb-3 shadow-sm"
              />
              
              <span className={cn(
                "text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold mt-1 scale-90",
                isCustom 
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400" 
                  : "bg-slate-50 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400"
              )}>
                {isCustom ? 'Kustom' : 'Sistem'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
