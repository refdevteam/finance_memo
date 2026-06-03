import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export async function RecentTransactions() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      amount,
      type,
      description,
      transaction_date,
      created_at,
      categories (
        name,
        icon,
        color
      ),
      wallets (
        name
      )
    `)
    .eq('user_id', user.id)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error("Error fetching recent transactions:", error)
    return <p className="text-sm text-red-500">Gagal memuat transaksi.</p>
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-sm italic">Belum ada transaksi.</p>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="space-y-2">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {transactions.map((t: any) => {
        // Fallback untuk transaksi tanpa kategori
        const categoryColor = t.categories?.color || '#94a3b8' // slate-400
        const categoryIcon = t.categories?.icon || '📄'
        const categoryName = t.categories?.name || 'Lainnya'
        
        return (
          <div 
            key={t.id} 
            className="flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 dark:hover:bg-secondary/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div 
                className="h-12 w-12 rounded-[1rem] flex items-center justify-center text-xl shadow-sm border border-border"
                style={{ 
                  backgroundColor: `${categoryColor}15`, // Transparan 15%
                  color: categoryColor 
                }}
              >
                <span>{categoryIcon}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground line-clamp-1">
                  {t.description || categoryName}
                </p>
                <div className="flex items-center text-xs text-muted-foreground mt-1 gap-2">
                  <span className="font-medium bg-secondary px-2 py-0.5 rounded-md">
                    {t.wallets?.name || 'Dompet'}
                  </span>
                  <span>•</span>
                  <span>{format(new Date(t.transaction_date), 'd MMM yyyy', { locale: id })}</span>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <p className={`font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-foreground'}`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
