import { 
  Banknote, 
  CreditCard, 
  Building2, 
  Wallet as WalletIcon,
  MoreVertical,
  Trash2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { deleteWallet } from '@/actions/wallets'
import { Button } from '@/components/ui/button'

interface WalletCardProps {
  id: string
  name: string
  type: string
  balance: number
  color?: string
}

export function WalletCard({ id, name, type, balance, color }: WalletCardProps) {
  const getIcon = () => {
    switch (type.toLowerCase()) {
      case 'bank': return Building2
      case 'e-wallet': return CreditCard
      case 'cash': return Banknote
      default: return WalletIcon
    }
  }

  const Icon = getIcon()

  return (
    <Card className="overflow-hidden border-none shadow-sm dark:bg-slate-900 group relative">
      <CardContent className="p-0">
        <div 
          className="h-1.5 w-full" 
          style={{ backgroundColor: color || '#10b981' }}
        />
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800">
              <Icon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  className="text-rose-600 focus:text-rose-600 cursor-pointer"
                  onClick={async () => {
                    if (confirm('Hapus dompet ini? Semua transaksi terkait akan ikut terhapus.')) {
                      await deleteWallet(id)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Hapus
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 capitalize">{type}</p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">{name}</h3>
            <p className="text-2xl font-black mt-2 tracking-tight text-emerald-600">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
