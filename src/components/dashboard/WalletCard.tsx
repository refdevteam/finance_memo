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
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 rounded-xl bg-secondary">
              <Icon className="h-6 w-6 text-muted-foreground" />
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
            <p className="text-sm font-medium text-muted-foreground capitalize">{type}</p>
            <h3 className="text-lg font-bold text-foreground truncate">{name}</h3>
            <p className="text-2xl font-black mt-2 tracking-tight text-emerald-600">
              {formatCurrency(balance)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
