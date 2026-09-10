'use client'

import { useState, useTransition } from 'react'
import { 
  Banknote, 
  CreditCard, 
  Building2, 
  Wallet as WalletIcon,
  MoreVertical,
  Trash2,
  Loader2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteWallet } from '@/actions/wallets'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface WalletCardProps {
  id: string
  name: string
  type: string
  balance: number
  color?: string
}

export function WalletCard({ id, name, type, balance, color }: WalletCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isPending, startTransition] = useTransition()
  const walletColor = color || '#000000'

  const getIcon = () => {
    switch (type.toLowerCase()) {
      case 'bank': return Building2
      case 'e-wallet':
      case 'ewallet': return CreditCard
      case 'cash': return Banknote
      default: return WalletIcon
    }
  }

  const Icon = getIcon()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteWallet(id)
        toast.success(`Dompet "${name}" berhasil dihapus`)
      } catch (error) {
        toast.error('Gagal menghapus dompet. Coba lagi.')
        setShowDeleteDialog(false)
      }
    })
  }

  return (
    <>
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group overflow-hidden rounded-xl border-2 border-black dark:border-neutral-700 bg-white dark:bg-zinc-900 transition-all duration-200 relative p-4 sm:p-5 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] cursor-pointer select-none"
        style={{
          boxShadow: isHovered
            ? `6px 6px 0px ${walletColor}`
            : `3px 3px 0px ${walletColor}`,
          transform: isHovered ? 'translate(-3px, -3px)' : 'none',
        }}
      >
        {/* Top Section */}
        <div className="flex justify-between items-start w-full">
          <div 
            className="p-2 sm:p-2.5 rounded-xl border border-black/10 dark:border-white/10 flex items-center justify-center"
            style={{ 
              backgroundColor: `${walletColor}12`, 
              color: walletColor 
            }}
          >
            <Icon className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5 shrink-0" />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-neutral-500 dark:text-neutral-400"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="border-2 border-black dark:border-white shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <DropdownMenuItem 
                className="text-rose-600 focus:text-rose-600 cursor-pointer font-bold text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteDialog(true)
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Hapus Dompet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Bottom Section */}
        <div className="mt-3.5 space-y-1.5">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white truncate tracking-tight">
              {name}
            </h3>
            <span 
              className="inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider font-mono border mt-1"
              style={{ 
                borderColor: `${walletColor}30`, 
                color: walletColor, 
                backgroundColor: `${walletColor}08` 
              }}
            >
              {type}
            </span>
          </div>
          
          <p className="text-base sm:text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">
            {formatCurrency(balance)}
          </p>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/40 shrink-0">
                <Trash2 className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </span>
              Hapus Dompet?
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-1">
              Tindakan ini tidak dapat dibatalkan. Dompet{' '}
              <span className="font-semibold text-foreground">&ldquo;{name}&rdquo;</span>{' '}
              dan semua transaksi yang terkait akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white border-transparent focus-visible:ring-rose-500"
            >
              {isPending
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Menghapus...</>
                : 'Ya, Hapus'
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
