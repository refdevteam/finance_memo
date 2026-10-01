'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Button } from '@/components/ui/button'
import { InlineSelect } from '@/components/ui/inline-select'
import { toast } from 'sonner'
import { Loader2, Trash2, CheckCircle2, RotateCcw, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIDR } from '@/lib/utils/currency'
import { markSharePaid, unmarkSharePaid, deleteSplitBill } from '@/actions/split-bills'
import { PartnerAvatar } from './PartnerAvatar'
import type { SplitBillWithShares, WalletOpt } from './types'

export function SplitBillDetail({
  bill,
  wallets,
  onOpenChange,
}: {
  bill: SplitBillWithShares | null
  wallets: WalletOpt[]
  onOpenChange: (open: boolean) => void
}) {
  const [settleTarget, setSettleTarget] = useState<string | null>(null)
  const [recordIncome, setRecordIncome] = useState(true)
  const [incomeWalletId, setIncomeWalletId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const open = bill !== null

  useEffect(() => {
    if (open) {
      setSettleTarget(null)
      setRecordIncome(true)
      setIncomeWalletId(wallets[0]?.id || '')
      setBusyId(null)
      setDeleting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill?.id])

  if (!bill) return null

  const totalPending = bill.split_bill_shares
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + Number(s.amount), 0)
  const paidCount = bill.split_bill_shares.filter((s) => s.status === 'paid').length

  const confirmSettle = async (shareId: string) => {
    setBusyId(shareId)
    try {
      const res = await markSharePaid(shareId, {
        record_income: recordIncome,
        wallet_id: recordIncome ? incomeWalletId : undefined,
      })
      if (!res.success) {
        toast.error(res.error || 'Gagal menandai lunas')
        return
      }
      toast.success('Pembayaran ditandai lunas')
      setSettleTarget(null)
    } finally {
      setBusyId(null)
    }
  }

  const handleUnmark = async (shareId: string) => {
    setBusyId(shareId)
    try {
      const res = await unmarkSharePaid(shareId)
      if (!res.success) {
        toast.error(res.error || 'Gagal membatalkan status lunas')
        return
      }
      toast.success('Status lunas dibatalkan')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async () => {
    if (!bill) return
    setDeleting(true)
    try {
      const res = await deleteSplitBill(bill.id)
      if (!res.success) {
        toast.error(res.error || 'Gagal menghapus tagihan')
        return
      }
      toast.success('Tagihan patungan dihapus')
      onOpenChange(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span className="truncate">{bill.title}</span>
            <span
              className={cn(
                'text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full shrink-0',
                bill.status === 'settled'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
              )}
            >
              {bill.status === 'settled' ? 'Lunas' : 'Berjalan'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {new Date(bill.created_at).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Total Tagihan
            </p>
            <p className="text-lg font-bold mt-1">{formatIDR(Number(bill.amount))}</p>
          </div>
          <div className="rounded-xl border border-border p-3 bg-amber-500/5">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Sisa Piutang
            </p>
            <p className="text-lg font-bold mt-1 text-amber-700 dark:text-amber-400">
              {formatIDR(totalPending)}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {paidCount}/{bill.split_bill_shares.length} teman sudah bayar
            </span>
            <span>{Math.round((paidCount / Math.max(bill.split_bill_shares.length, 1)) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${(paidCount / Math.max(bill.split_bill_shares.length, 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Panel konfirmasi lunas */}
        {settleTarget && (
          <div className="rounded-xl border-2 border-black dark:border-white bg-indigo-50 dark:bg-indigo-950/30 p-4 space-y-3">
            <p className="text-sm font-semibold">Tandai pembayaran lunas?</p>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={recordIncome}
                onChange={(e) => setRecordIncome(e.target.checked)}
                className="h-4 w-4 accent-black dark:accent-white"
              />
              Catat sebagai pemasukan (uang masuk ke dompet)
            </label>

            {recordIncome && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                  Dompet penerima
                </div>
                <InlineSelect
                  options={wallets.map((w) => ({ value: w.id, label: w.name }))}
                  value={incomeWalletId}
                  onChange={setIncomeWalletId}
                  placeholder="Pilih dompet"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setSettleTarget(null)}
                disabled={busyId !== null}
              >
                Batal
              </Button>
              <Button
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => confirmSettle(settleTarget)}
                disabled={busyId !== null || (recordIncome && !incomeWalletId)}
              >
                {busyId === settleTarget ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Konfirmasi'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Daftar per teman */}
        <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
          {bill.split_bill_shares.map((share) => {
            const isPaid = share.status === 'paid'
            return (
              <div key={share.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <PartnerAvatar name={share.name} src={share.avatar_url} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{share.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {isPaid && share.paid_at
                          ? `Dibayar ${new Date(share.paid_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                            })}`
                          : 'Belum dibayar'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold">{formatIDR(Number(share.amount))}</span>
                    <span
                      className={cn(
                        'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full',
                        isPaid
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      )}
                    >
                      {isPaid ? 'Lunas' : 'Pending'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end">
                  {isPaid ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => handleUnmark(share.id)}
                      disabled={busyId !== null}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Batalkan lunas
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSettleTarget(share.id)}
                      disabled={busyId !== null || settleTarget !== null}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Tandai Lunas
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Hapus split */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/30"
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Hapus Tagihan
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Tagihan Patungan?</AlertDialogTitle>
              <AlertDialogDescription>
                Transaksi pengeluaran dan seluruh daftar pembayaran teman akan ikut terhapus.
                Pemasukan yang sudah tercatat dari pelunasan tetap tersimpan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ya, Hapus'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
