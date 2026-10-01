'use client'

import { useState } from 'react'
import { ScanLine, UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { addPartner } from '@/actions/split-bills'
import { QrScannerSheet, type QrScanResult } from './QrScannerSheet'
import { PartnerAvatar } from './PartnerAvatar'
import type { Partner } from './types'

interface PendingScan {
  name: string
  avatar_url?: string | null
  partner_user_id?: string
}

export function AddPartnerPanel({
  partners,
  onPartnerAdded,
  onExistingScanned,
}: {
  partners: Partner[]
  onPartnerAdded: (partner: Partner) => void
  onExistingScanned?: (partner: Partner) => void
}) {
  const [scannerOpen, setScannerOpen] = useState(false)
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null)
  const [manualName, setManualName] = useState('')
  const [busy, setBusy] = useState(false)

  const handleScanResult = (result: QrScanResult) => {
    if (!result.valid) {
      toast.error('Bukan QR Fimo yang valid')
      if (result.raw) {
        setManualName(result.raw.slice(0, 120))
      }
      return
    }

    const existing = partners.find(
      (p) => p.partner_user_id && p.partner_user_id === result.partner_user_id
    )

    if (existing) {
      onExistingScanned?.(existing)
      toast.success(`${existing.name} sudah ada di daftar — dipilih otomatis`)
      return
    }

    setPendingScan({
      name: result.name || '',
      avatar_url: result.avatar_url,
      partner_user_id: result.partner_user_id,
    })
  }

  const confirmScan = async () => {
    if (!pendingScan) return
    const name = pendingScan.name.trim()
    if (!name) {
      toast.error('Nama teman wajib diisi')
      return
    }

    setBusy(true)
    try {
      const res = await addPartner({
        name,
        partner_user_id: pendingScan.partner_user_id,
        avatar_url: pendingScan.avatar_url,
        source: 'qr',
      })

      if (!res.success || !res.partner) {
        toast.error(res.error || 'Gagal menambahkan teman')
        return
      }

      onPartnerAdded(res.partner as Partner)
      setPendingScan(null)
      toast.success(`${(res.partner as Partner).name} ditambahkan`)
    } finally {
      setBusy(false)
    }
  }

  const addManual = async () => {
    const name = manualName.trim()
    if (!name) {
      toast.error('Nama teman wajib diisi')
      return
    }

    setBusy(true)
    try {
      const res = await addPartner({ name, source: 'manual' })

      if (!res.success || !res.partner) {
        toast.error(res.error || 'Gagal menambahkan teman')
        return
      }

      onPartnerAdded(res.partner as Partner)
      setManualName('')
      toast.success(`${(res.partner as Partner).name} ditambahkan`)
    } finally {
      setBusy(false)
    }
  }

  if (pendingScan) {
    return (
      <div className="rounded-xl border-2 border-black dark:border-white bg-indigo-50 dark:bg-indigo-950/30 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <PartnerAvatar name={pendingScan.name || '?'} src={pendingScan.avatar_url} />
          <div className="min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              QR Fimo terbaca
            </p>
            <p className="text-sm font-bold truncate">
              {pendingScan.name || 'Nama tidak terbaca'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-foreground">Nama teman</label>
          <Input
            value={pendingScan.name}
            onChange={(e) => setPendingScan({ ...pendingScan, name: e.target.value })}
            placeholder="Nama tampilan..."
            disabled={busy}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onClick={() => setPendingScan(null)}
            disabled={busy}
          >
            Batal
          </Button>
          <Button
            className="flex-1 rounded-xl bg-black text-white dark:bg-white dark:text-black"
            onClick={confirmScan}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Simpan & Pilih
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-xl border-2 border-black dark:border-white font-semibold"
          onClick={() => setScannerOpen(true)}
          disabled={busy}
        >
          <ScanLine className="h-4 w-4 mr-2" />
          Scan QR
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={manualName}
          onChange={(e) => setManualName(e.target.value)}
          placeholder="Atau ketik nama teman..."
          className="flex-1"
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addManual()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={addManual}
          disabled={busy || !manualName.trim()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
        </Button>
      </div>

      <QrScannerSheet
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onResult={handleScanResult}
      />
    </div>
  )
}
