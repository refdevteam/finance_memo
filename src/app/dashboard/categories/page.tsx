import { getCategories } from '@/actions/categories'
import { CategoryBadge } from '@/components/dashboard/CategoryBadge'
import { CategoryForm } from '@/components/dashboard/CategoryForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function CategoriesPage() {
  const categories = await getCategories()
  
  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kategori Transaksi</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Daftar kategori untuk mengelompokkan keuangan kamu.
          </p>
        </div>
        <CategoryForm />
      </div>

      <Tabs defaultValue="expense" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-slate-100 dark:bg-slate-900 rounded-xl">
          <TabsTrigger value="expense" className="rounded-lg">Pengeluaran</TabsTrigger>
          <TabsTrigger value="income" className="rounded-lg">Pemasukan</TabsTrigger>
        </TabsList>

        {/* Pengeluaran Tab */}
        <TabsContent value="expense" className="pt-4 md:pt-6">
          {/* Mobile List View */}
          <div className="block sm:hidden space-y-2.5">
            {expenseCategories.map((cat) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const Icon = (LucideIcons as any)[cat.icon || 'Tag'] || LucideIcons.Tag
              return (
                <div 
                  key={cat.id} 
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center border"
                      style={{ 
                        backgroundColor: `${cat.color}15`, 
                        color: cat.color || '#64748b',
                        borderColor: `${cat.color}30` 
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {cat.name}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold",
                    cat.user_id 
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" 
                      : "bg-slate-50 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400"
                  )}>
                    {cat.user_id ? 'Custom' : 'Sistem'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Desktop Grid View */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {expenseCategories.map((cat) => (
              <div 
                key={cat.id} 
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-2 text-center"
              >
                <CategoryBadge 
                  name={cat.name} 
                  iconName={cat.icon} 
                  color={cat.color} 
                  className="scale-110"
                />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  {cat.user_id ? 'Custom' : 'System'}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Pemasukan Tab */}
        <TabsContent value="income" className="pt-4 md:pt-6">
          {/* Mobile List View */}
          <div className="block sm:hidden space-y-2.5">
            {incomeCategories.map((cat) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const Icon = (LucideIcons as any)[cat.icon || 'Tag'] || LucideIcons.Tag
              return (
                <div 
                  key={cat.id} 
                  className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.99] transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center border"
                      style={{ 
                        backgroundColor: `${cat.color}15`, 
                        color: cat.color || '#64748b',
                        borderColor: `${cat.color}30` 
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {cat.name}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest font-bold",
                    cat.user_id 
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400" 
                      : "bg-slate-50 text-slate-500 dark:bg-slate-800/40 dark:text-slate-400"
                  )}>
                    {cat.user_id ? 'Custom' : 'Sistem'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Desktop Grid View */}
          <div className="hidden sm:grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {incomeCategories.map((cat) => (
              <div 
                key={cat.id} 
                className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center space-y-2 text-center"
              >
                <CategoryBadge 
                  name={cat.name} 
                  iconName={cat.icon} 
                  color={cat.color} 
                  className="scale-110"
                />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  {cat.user_id ? 'Custom' : 'System'}
                </span>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

