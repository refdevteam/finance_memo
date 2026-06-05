'use client'

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
    <Card className="overflow-hidden group relative">
      <CardContent className="p-0">
        <div 
          className="h-1.5 w-full" 
          style={{ backgroundColor: color || '#000000' }}
        />
        <div className="p-3.5 sm:p-6">
          <div className="flex justify-between items-start mb-2.5 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-secondary">
              <Icon className="h-4.5 w-4.5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
            <p className="text-[10px] sm:text-sm font-medium text-muted-foreground capitalize">{type}</p>
            <h3 className="text-xs sm:text-lg font-extrabold sm:font-bold text-foreground truncate">{name}</h3>
            <p className="text-sm sm:text-2xl font-extrabold sm:font-black mt-1 sm:mt-2 tracking-tight text-emerald-600 font-mono">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
