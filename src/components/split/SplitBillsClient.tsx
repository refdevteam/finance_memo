'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Plus,
  Users,
  ReceiptText,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatIDR } from '@/lib/utils/currency'
import { renamePartner, deletePartner } from '@/actions/split-bills'
import { SplitBillForm } from './SplitBillForm'
import { SplitBillDetail } from './SplitBillDetail'
import { PartnerAvatar } from './PartnerAvatar'
import { AddPartnerPanel } from './AddPartnerPanel'
import { MyQrCode } from './MyQrCode'
import type {
  CategoryOpt,
  Partner,
  SharedBill,
  SplitBillWithShares,
  SplitPrefill,
  WalletOpt,
} from './types'

type Tab = 'bills' | 'partners'

export function SplitBillsClient({
  splits,
  sharedBills,
  partners,
  wallets,
  categories,
  profile,
  prefill,
}: {
  splits: SplitBillWithShares[]
  sharedBills: SharedBill[]
  partners: Partner[]
  wallets: WalletOpt[]
  categories: CategoryOpt[]
  profile: { user_id: string; full_name: string | null; avatar_url: string | null }
  prefill: SplitPrefill
}) {
  const [tab, setTab] = useState<Tab>('bills')
  const [formOpen, setFormOpen] = useState(prefill.new)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [localPartners, setLocalPartners] = useState<Partner[]>(partners)

  // Landing dari notifikasi (?shared=1): highlight + scroll ke section teman
  const searchParams = useSearchParams()
  const fromShared = searchParams.get('shared') === '1'
  const sharedRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (fromShared && sharedRef.current) {
      sharedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [fromShared])

  // Sinkronkan partner baru dari server (hasil revalidate)
  useEffect(() => {
    setLocalPartners((prev) => {
      const ids = new Set(prev.map((p) => p.id))
      const additions = partners.filter((p) => !ids.has(p.id))
      return additions.length > 0 ? [...additions, ...prev] : prev
    })
  }, [partners])

  // State rename partner
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [busy, setBusy] = useState(false)

  const summary = useMemo(() => {
    const pending = splits.reduce(
      (sum, b) =>
        sum +
        b.split_bill_shares
          .filter((s) => s.status === 'pending')
          .reduce((s, share) => s + Number(share.amount), 0),
      0
    )
    const open = splits.filter((b) => b.status === 'open').length
    const settled = splits.filter((b) => b.status === 'settled').length
    return { pending, open, settled }
  }, [splits])

  const detailBill = useMemo(
    () => (detailId ? splits.find((b) => b.id === detailId) || null : null),
    [detailId, splits]
  )

  const sortedSplits = useMemo(
    () =>
      [...splits].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [splits]
  )

  const handlePartnerAdded = (partner: Partner) => {
    setLocalPartners((prev) =>
      prev.some((p) => p.id === partner.id) ? prev : [partner, ...prev]
    )
  }

  const saveRename = async (id: string) => {
    setBusy(true)
    try {
      const res = await renamePartner(id, editName)
      if (!res.success) {
        toast.error(res.error || 'Gagal memperbarui nama')
        return
      }
      setLocalPartners((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: editName.trim() } : p))
      )
      setEditingId(null)
      toast.success('Nama teman diperbarui')
    } finally {
      setBusy(false)
    }
  }

  const removePartner = async (id: string) => {
    setBusy(true)
    try {
      const res = await deletePartner(id)
      if (!res.success) {
        toast.error(res.error || 'Gagal menghapus teman')
        return
      }
      setLocalPartners((prev) => prev.filter((p) => p.id !== id))
      toast.success('Teman dihapus dari daftar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white">Split Bill</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Patungan bareng teman — tagihanmu tercatat, piutang per teman ikut terpantau.
          </p>
        </div>
        <Button
          onClick={() => setFormOpen(true)}
          className="bg-black text-white dark:bg-white dark:text-black hover:opacity-90 rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Buat Split Baru
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setTab('bills')}
          className={cn(
            'px-4 py-2.5 border-b-2 font-semibold text-sm transition-all',
            tab === 'bills'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Patungan
        </button>
        <button
          type="button"
          onClick={() => setTab('partners')}
          className={cn(
            'px-4 py-2.5 border-b-2 font-semibold text-sm transition-all',
            tab === 'partners'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Teman Bayar
          <span className="ml-2 text-[10px] font-mono">{localPartners.length}</span>
        </button>
      </div>

      {/* ================= TAB: PATUNGAN ================= */}
      {tab === 'bills' && (
        <div className="space-y-6">
          {/* Tagihan dari teman (read-only, via share) */}
          {sharedBills.length > 0 && (
            <div
              ref={sharedRef}
              className={cn(
                'space-y-3 rounded-xl p-1 transition-all',
                fromShared && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-background'
              )}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Tagihan dari Teman ({sharedBills.length})
                </span>
              </div>

              <div className="space-y-3">
                {sharedBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="bg-card rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <PartnerAvatar
                          name={bill.payer_name || 'Teman'}
                          src={bill.payer_avatar}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold truncate">{bill.title}</p>
                            <span
                              className={cn(
                                'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full shrink-0',
                                bill.my_share_status === 'paid'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                              )}
                            >
                              {bill.my_share_status === 'paid' ? 'Sudah dibayar' : 'Belum dibayar'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            dari {bill.payer_name || 'Teman'}
                            {' · '}
                            {new Date(bill.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{formatIDR(Number(bill.my_share_amount))}</p>
                        <p className="text-[11px] text-muted-foreground">
                          dari total {formatIDR(Number(bill.amount))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ringkasan */}
          <div className="grid grid-cols-2 gap-3 md:max-w-lg">
            <div className="bg-card rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] p-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Total Piutang
              </p>
              <p className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                {formatIDR(summary.pending)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">dari teman yang belum bayar</p>
            </div>
            <div className="bg-card rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] p-4">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Status
              </p>
              <p className="text-xl font-bold mt-1">
                {summary.settled}
                <span className="text-sm text-muted-foreground font-medium">
                  /{summary.open + summary.settled} lunas
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{summary.open} masih berjalan</p>
            </div>
          </div>

          {/* List */}
          {sortedSplits.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-border p-10 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto">
                <ReceiptText className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold">Belum ada tagihan patungan</p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  Scan struk AI lalu tekan <span className="font-semibold">Bagi Tagihan</span>,
                  atau buat split baru secara manual untuk mulai menagih teman.
                </p>
              </div>
              <Button
                onClick={() => setFormOpen(true)}
                className="bg-black text-white dark:bg-white dark:text-black rounded-xl"
              >
                <Plus className="h-4 w-4 mr-2" />
                Buat Split Baru
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSplits.map((bill) => {
                const total = bill.split_bill_shares.length
                const paid = bill.split_bill_shares.filter((s) => s.status === 'paid').length
                const pendingAmount = bill.split_bill_shares
                  .filter((s) => s.status === 'pending')
                  .reduce((sum, s) => sum + Number(s.amount), 0)

                return (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() => setDetailId(bill.id)}
                    className="w-full text-left bg-card rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] p-4 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold truncate">{bill.title}</p>
                          <span
                            className={cn(
                              'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full shrink-0',
                              bill.status === 'settled'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            )}
                          >
                            {bill.status === 'settled' ? 'Lunas' : 'Berjalan'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(bill.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {' · '}
                          {bill.split_method === 'equal' ? 'Bagi rata' : 'Nominal manual'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="font-bold">{formatIDR(Number(bill.amount))}</p>
                          {pendingAmount > 0 && (
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              piutang {formatIDR(pendingAmount)}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all',
                            bill.status === 'settled' ? 'bg-emerald-500' : 'bg-indigo-500'
                          )}
                          style={{ width: `${(paid / Math.max(total, 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {paid}/{total}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB: TEMAN BAYAR ================= */}
      {tab === 'partners' && (
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          {/* QR Saya */}
          <MyQrCode
            userId={profile.user_id}
            name={profile.full_name || ''}
            avatarUrl={profile.avatar_url}
          />

          <div className="space-y-4">
            {/* Tambah via scan / manual */}
            <div className="bg-card rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Tambah teman
                </span>
              </div>
              <AddPartnerPanel
                partners={localPartners}
                onPartnerAdded={handlePartnerAdded}
                onExistingScanned={() =>
                  toast.info('Teman itu sudah ada di daftarmu')
                }
              />
            </div>

            {/* Daftar partner */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Daftar terakhir ({localPartners.length})
              </span>

              {localPartners.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                  Belum ada teman. Scan QR Fimo temanmu agar mudah dipilih lagi nanti.
                </div>
              ) : (
                <div className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-card">
                  {[...localPartners]
                    .sort(
                      (a, b) =>
                        new Date(b.last_used_at).getTime() -
                        new Date(a.last_used_at).getTime()
                    )
                    .map((p) => (
                      <div key={p.id} className="p-3 flex items-center gap-3">
                        <PartnerAvatar name={p.name} src={p.avatar_url} size="sm" />

                        {editingId === p.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveRename(p.id)
                                if (e.key === 'Escape') setEditingId(null)
                              }}
                            />
                            <Button
                              size="sm"
                              className="h-8 text-xs rounded-lg"
                              onClick={() => saveRename(p.id)}
                              disabled={busy || !editName.trim()}
                            >
                              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Simpan'}
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{p.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {p.source === 'qr' ? 'via QR' : 'manual'} · terakhir{' '}
                                {new Date(p.last_used_at).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(p.id)
                                  setEditName(p.name)
                                }}
                                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                                aria-label="Ubah nama"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="h-8 w-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                    aria-label="Hapus teman"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus {p.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Teman dihapus dari daftar terakhirmu. Riwayat tagihan lama
                                      tidak ikut terhapus.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removePartner(p.id)}
                                      className="bg-rose-600 hover:bg-rose-700"
                                    >
                                      Ya, Hapus
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form buat split */}
      <SplitBillForm
        open={formOpen}
        onOpenChange={setFormOpen}
        wallets={wallets}
        categories={categories}
        partners={localPartners}
        onPartnerAdded={handlePartnerAdded}
        prefill={prefill}
      />

      {/* Detail split */}
      <SplitBillDetail
        bill={detailBill}
        wallets={wallets}
        onOpenChange={(open) => {
          if (!open) setDetailId(null)
        }}
      />
    </div>
  )
}
