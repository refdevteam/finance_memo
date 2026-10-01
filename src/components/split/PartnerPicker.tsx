'use client'

import { useState, useMemo } from 'react'
import { Search, Check, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AddPartnerPanel } from './AddPartnerPanel'
import { PartnerAvatar } from './PartnerAvatar'
import type { Partner, ShareDraft } from './types'

function toDraft(p: Partner): ShareDraft {
  return {
    partner_id: p.id,
    partner_user_id: p.partner_user_id,
    name: p.name,
    avatar_url: p.avatar_url,
  }
}

export function PartnerPicker({
  partners,
  selected,
  onToggle,
  onPartnerAdded,
}: {
  partners: Partner[]
  selected: ShareDraft[]
  onToggle: (draft: ShareDraft) => void
  onPartnerAdded: (partner: Partner) => void
}) {
  const [query, setQuery] = useState('')

  const selectedIds = useMemo(
    () => new Set(selected.map((s) => s.partner_id).filter(Boolean)),
    [selected]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...partners].sort(
      (a, b) => new Date(b.last_used_at).getTime() - new Date(a.last_used_at).getTime()
    )
    if (!q) return sorted
    return sorted.filter((p) => p.name.toLowerCase().includes(q))
  }, [partners, query])

  return (
    <div className="space-y-4">
      {/* Daftar teman lama — dicek DULU sebelum scan */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Teman bayar kamu
          </label>
          <span className="text-xs text-muted-foreground">
            {selected.length} dipilih
          </span>
        </div>

        {partners.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama teman..."
              className="pl-9"
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border p-5 text-center">
            <Users className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {partners.length === 0
                ? 'Belum ada teman bayar. Scan QR Fimo temanmu atau tambah manual di bawah.'
                : 'Tidak ada nama yang cocok.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border overflow-hidden max-h-[240px] overflow-y-auto">
            {filtered.map((p) => {
              const isSelected = selectedIds.has(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onToggle(toDraft(p))}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 text-left transition-colors',
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/30'
                      : 'hover:bg-secondary/60'
                  )}
                >
                  <PartnerAvatar name={p.name} src={p.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.source === 'qr' ? 'via QR' : 'manual'} ·{' '}
                      {new Date(p.last_used_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div
                    className={cn(
                      'h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      isSelected
                        ? 'bg-black border-black dark:bg-white dark:border-white text-white dark:text-black'
                        : 'border-border'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          belum ada?
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Tambah baru: scan QR / manual */}
      <AddPartnerPanel
        partners={partners}
        onPartnerAdded={onPartnerAdded}
        onExistingScanned={(p) => onToggle(toDraft(p))}
      />
    </div>
  )
}
