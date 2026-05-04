import { getCategories } from '@/actions/categories'
import { CategoryBadge } from '@/components/dashboard/CategoryBadge'
import { CategoryForm } from '@/components/dashboard/CategoryForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function CategoriesPage() {
  const categories = await getCategories()
  
  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kategori Transaksi</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Daftar kategori untuk mengelompokkan keuangan Anda.
          </p>
        </div>
        <CategoryForm />
      </div>

      <Tabs defaultValue="expense" className="w-full">
        <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-slate-100 dark:bg-slate-900">
          <TabsTrigger value="expense">Pengeluaran</TabsTrigger>
          <TabsTrigger value="income">Pemasukan</TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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

        <TabsContent value="income" className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
