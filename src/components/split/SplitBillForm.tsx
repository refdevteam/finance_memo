'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InlineSelect } from '@/components/ui/inline-select'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, Loader2, Users, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatIDR } from '@/lib/utils/currency'
import { createSplitBill } from '@/actions/split-bills'
import { PartnerPicker } from './PartnerPicker'
import { PartnerAvatar } from './PartnerAvatar'
import type { CategoryOpt, Partner, ShareDraft, SplitPrefill, WalletOpt } from './types'

const STEPS = ['Detail', 'Teman', 'Bagi', 'Konfirmasi']

export function SplitBillForm({
  open,
  onOpenChange,
  wallets,
  categories,
  partners,
  onPartnerAdded,
  prefill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallets: WalletOpt[]
  categories: CategoryOpt[]
  partners: Partner[]
  onPartnerAdded: (partner: Partner) => void
  prefill?: SplitPrefill
}) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1 — detail
  const [title, setTitle] = useState('')
  const [amountRaw, setAmountRaw] = useState('')
  const [walletId, setWalletId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [receiptId, setReceiptId] = useState<string | undefined>(undefined)

  // Step 2 — teman
  const [selected, setSelected] = useState<ShareDraft[]>([])

  // Step 3 — pembagian
  const [method, setMethod] = useState<'equal' | 'custom'>('equal')
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({})

  const amount = useMemo(
    () => Number((amountRaw || '').replace(/[^0-9]/g, '')) || 0,
    [amountRaw]
  )
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  )

  // Hitungan pembagian
  const n = selected.length
  const equalPerPerson = n > 0 ? Math.floor(amount / (n + 1)) : 0
  const equalMyShare = amount - equalPerPerson * n

  const customShares = selected.map((s) => ({
    ...s,
    amount: Number((customAmounts[s.partner_id || ''] || '').replace(/[^0-9]/g, '')) || 0,
  }))
  const customSum = customShares.reduce((sum, s) => sum + s.amount, 0)
  const customMyShare = amount - customSum

  // Reset & prefill saat dialog dibuka
  useEffect(() => {
    if (!open) return

    setStep(1)
    setLoading(false)
    setSelected([])
    setMethod('equal')
    setCustomAmounts({})
    setTitle(prefill?.title || '')
    setAmountRaw(prefill?.amount ? String(prefill.amount) : '')
    setDate(prefill?.date || new Date().toISOString().split('T')[0])
    setReceiptId(prefill?.receipt_id)

    const defaultWallet = wallets[0]?.id || ''
    setWalletId(defaultWallet)

    // Auto-match kategori dari saran hasil scan struk
    let matchedCategory = ''
    if (prefill?.category_name) {
      const q = prefill.category_name.toLowerCase()
      const matched = expenseCategories.find(
        (c) =>
          c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase())
      )
      if (matched) matchedCategory = matched.id
    }
    if (!matchedCategory) matchedCategory = expenseCategories[0]?.id || ''
    setCategoryId(matchedCategory)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Isi custom amounts dengan pembagian rata saat masuk step 3 / pilih teman
  useEffect(() => {
    setCustomAmounts((prev) => {
      const next = { ...prev }
      for (const s of selected) {
        const key = s.partner_id || ''
        if (key && !next[key]) next[key] = String(equalPerPerson || '')
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.length, amount])

  const togglePartner = (draft: ShareDraft) => {
    setSelected((prev) => {
      const key = draft.partner_id || draft.partner_user_id || draft.name
      const exists = prev.some(
        (s) => (s.partner_id || s.partner_user_id || s.name) === key
      )
      if (exists) {
        return prev.filter(
          (s) => (s.partner_id || s.partner_user_id || s.name) !== key
        )
      }
      return [...prev, draft]
    })
  }

  const handlePartnerAdded = (partner: Partner) => {
    onPartnerAdded(partner)
    setSelected((prev) => [
      ...prev,
      {
        partner_id: partner.id,
        partner_user_id: partner.partner_user_id,
        name: partner.name,
        avatar_url: partner.avatar_url,
      },
    ])
  }

  const validateStep = (): string | null => {
    if (step === 1) {
      if (!title.trim()) return 'Judul tagihan wajib diisi'
      if (amount < 1) return 'Jumlah harus lebih dari 0'
      if (!walletId) return 'Dompet harus dipilih'
      if (!categoryId) return 'Kategori harus dipilih'
      if (!date) return 'Tanggal wajib diisi'
    }
    if (step === 2) {
      if (n < 1) return 'Pilih minimal satu teman'
    }
    if (step === 3) {
      if (method === 'equal') {
        if (equalPerPerson < 1) return `Jumlah terlalu kecil untuk dibagi rata dengan ${n} teman`
      } else {
        if (customShares.some((s) => s.amount < 1)) return 'Semua teman harus punya bagian'
        if (customSum > amount) return 'Total bagian teman melebihi total tagihan'
      }
    }
    return null
  }

  const goNext = () => {
    const error = validateStep()
    if (error) {
      toast.error(error)
      return
    }
    setStep((s) => Math.min(s + 1, 4))
  }

  const submit = async () => {
    const error = validateStep()
    if (error) {
      toast.error(error)
      return
    }

    setLoading(true)
    try {
      const shares =
        method === 'equal'
          ? selected.map((s) => ({
              partner_id: s.partner_id ?? undefined,
              partner_user_id: s.partner_user_id ?? undefined,
              name: s.name,
              avatar_url: s.avatar_url,
              amount: equalPerPerson,
            }))
          : customShares.map((s) => ({
              partner_id: s.partner_id ?? undefined,
              partner_user_id: s.partner_user_id ?? undefined,
              name: s.name,
              avatar_url: s.avatar_url,
              amount: s.amount,
            }))

      const result = await createSplitBill({
        title: title.trim(),
        amount,
        wallet_id: walletId,
        category_id: categoryId,
        transaction_date: date,
        receipt_id: receiptId,
        split_method: method,
        shares,
      })

      if (!result.success) {
        toast.error(result.error || 'Gagal menyimpan tagihan patungan')
        return
      }

      toast.success('Tagihan patungan berhasil disimpan!')
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  const myShare = method === 'equal' ? equalMyShare : customMyShare

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bagi Tagihan</DialogTitle>
          <DialogDescription>
            Buat tagihan patungan — total dicatat sebagai transaksi pengeluaranmu.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 pt-2">
          {STEPS.map((label, i) => {
            const num = i + 1
            const isDone = step > num
            const isActive = step === num
            return (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1 min-w-[52px]">
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-colors',
                      isDone
                        ? 'bg-black border-black dark:bg-white dark:border-white text-white dark:text-black'
                        : isActive
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-border text-muted-foreground'
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : num}
                  </div>
                  <span
                    className={cn(
                      'text-[10px] font-medium',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-px flex-1 mb-4 -mx-1',
                      step > num ? 'bg-black dark:bg-white' : 'bg-border'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* ================= STEP 1 — DETAIL ================= */}
        {step === 1 && (
          <div className="space-y-4 pt-2">
            {receiptId && (
              <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                Dari struk hasil scan — nominal bisa diubah
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="split-title">Judul Tagihan</Label>
              <Input
                id="split-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Makan malam, nonton, dll."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="split-amount">Total Tagihan</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500 font-medium">Rp</span>
                <Input
                  id="split-amount"
                  type="number"
                  inputMode="numeric"
                  className="pl-10 text-lg font-bold"
                  value={amountRaw}
                  onChange={(e) => setAmountRaw(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dompet</Label>
                <InlineSelect
                  options={
                    wallets.length === 0
                      ? [{ value: '', label: 'Belum ada dompet', disabled: true }]
                      : wallets.map((w) => ({ value: w.id, label: w.name }))
                  }
                  value={walletId}
                  onChange={setWalletId}
                  placeholder="Sumber dana"
                />
              </div>
              <div className="space-y-2">
                <Label>Kategori</Label>
                <InlineSelect
                  options={expenseCategories.map((c) => ({ value: c.id, label: c.name }))}
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Kategori"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="split-date">Tanggal</Label>
              <Input
                id="split-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2 — TEMAN ================= */}
        {step === 2 && (
          <div className="pt-2">
            <PartnerPicker
              partners={partners}
              selected={selected}
              onToggle={togglePartner}
              onPartnerAdded={handlePartnerAdded}
            />
          </div>
        )}

        {/* ================= STEP 3 — PEMBAGIAN ================= */}
        {step === 3 && (
          <div className="space-y-4 pt-2">
            <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setMethod('equal')}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                  method === 'equal'
                    ? 'bg-white dark:bg-card shadow-sm text-indigo-600'
                    : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                Bagi Rata
              </button>
              <button
                type="button"
                onClick={() => setMethod('custom')}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                  method === 'custom'
                    ? 'bg-white dark:bg-card shadow-sm text-indigo-600'
                    : 'text-neutral-500 dark:text-neutral-400'
                )}
              >
                Nominal Manual
              </button>
            </div>

            {/* Bagianmu — selalu tampil */}
            <div className="rounded-xl bg-neutral-100 dark:bg-neutral-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-black dark:bg-white text-white dark:text-black text-xs font-bold flex items-center justify-center">
                  A
                </div>
                <div>
                  <p className="text-sm font-semibold">Bagianmu</p>
                  <p className="text-[11px] text-muted-foreground">Kamu yang bayar tagihan</p>
                </div>
              </div>
              <span className="text-sm font-bold">{formatIDR(Math.max(myShare, 0))}</span>
            </div>

            {method === 'equal' ? (
              <div className="space-y-2">
                {selected.map((s) => (
                  <div
                    key={s.partner_id || s.name}
                    className="flex items-center justify-between p-3 rounded-xl border border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <PartnerAvatar name={s.name} src={s.avatar_url} size="sm" />
                      <span className="text-sm font-medium truncate">{s.name}</span>
                    </div>
                    <span className="text-sm font-bold">{formatIDR(equalPerPerson)}</span>
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Dibagi rata ke {n} teman + kamu (sisa).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {customShares.map((s) => {
                  const key = s.partner_id || ''
                  const invalid = s.amount < 1 || s.amount > amount
                  return (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                      <PartnerAvatar name={s.name} src={s.avatar_url} size="sm" />
                      <span className="text-sm font-medium flex-1 min-w-0 truncate">
                        {s.name}
                      </span>
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                          Rp
                        </span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          className="pl-7 h-9 text-sm"
                          value={customAmounts[key] ?? ''}
                          onChange={(e) =>
                            setCustomAmounts((prev) => ({
                              ...prev,
                              [key]: e.target.value.replace(/[^0-9]/g, ''),
                            }))
                          }
                        />
                      </div>
                      {invalid && (
                        <span className="text-[10px] text-destructive font-medium">!</span>
                      )}
                    </div>
                  )
                })}
                <div
                  className={cn(
                    'text-xs font-medium p-3 rounded-lg border',
                    customSum > amount
                      ? 'bg-destructive/10 border-destructive/30 text-destructive'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  )}
                >
                  {customSum > amount
                    ? `Total bagian melebihi tagihan (${formatIDR(customSum)})`
                    : `Sisa bagianmu: ${formatIDR(Math.max(customMyShare, 0))}`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 4 — KONFIRMASI ================= */}
        {step === 4 && (
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border-2 border-black dark:border-white p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Judul</span>
                <span className="font-semibold text-right">{title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total tagihan</span>
                <span className="font-bold">{formatIDR(amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Metode</span>
                <span className="font-medium">
                  {method === 'equal' ? 'Bagi rata' : 'Nominal manual'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bagianmu</span>
                <span className="font-medium">{formatIDR(Math.max(myShare, 0))}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Ditagih ke {n} teman
              </p>
              <div className="divide-y divide-border rounded-xl border border-border overflow-hidden">
                {selected.map((s) => {
                  const shareAmount =
                    method === 'equal'
                      ? equalPerPerson
                      : customShares.find((c) => c.partner_id === s.partner_id)?.amount || 0
                  return (
                    <div
                      key={s.partner_id || s.name}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <PartnerAvatar name={s.name} src={s.avatar_url} size="sm" />
                        <span className="text-sm truncate">{s.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{formatIDR(shareAmount)}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-secondary/60 rounded-lg p-3">
              <Wallet className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>
                Total {formatIDR(amount)} dicatat sebagai transaksi pengeluaran dari dompet
                pilihanmu. Penagihan ke teman dicatat sebagai piutang.
              </span>
            </div>
          </div>
        )}

        {/* Footer navigasi */}
        <div className="flex gap-2 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              className="w-1/3 rounded-xl"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Kembali
            </Button>
          )}
          {step < 4 ? (
            <Button
              type="button"
              className={cn('flex-1 rounded-xl', step === 1 && 'w-full')}
              onClick={goNext}
            >
              Lanjut
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={submit}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Simpan Split
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
