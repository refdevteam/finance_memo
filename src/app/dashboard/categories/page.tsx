import { getCategories } from '@/actions/categories'
import { CategoryForm } from '@/components/dashboard/CategoryForm'
import { CategoriesClient } from '@/components/dashboard/CategoriesClient'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 pb-28 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kategori Transaksi</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Daftar kategori untuk mengelompokkan keuangan kamu.
          </p>
        </div>
        <CategoryForm />
      </div>

      <CategoriesClient initialCategories={categories} />
    </div>
  )
}
