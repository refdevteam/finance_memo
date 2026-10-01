'use client'

import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Share2, Copy, CheckCircle, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function buildFimoQrPayload(userId: string, name: string, avatarUrl?: string | null) {
  return JSON.stringify({
    v: 1,
    t: 'fimo_user',
    id: userId,
    name: name || '',
    avatar: avatarUrl || undefined,
  })
}

export function MyQrCode({
  userId,
  name,
  avatarUrl,
}: {
  userId: string
  name: string
  avatarUrl?: string | null
}) {
  const [copied, setCopied] = useState(false)
  const payload = useMemo(
    () => buildFimoQrPayload(userId, name, avatarUrl),
    [userId, name, avatarUrl]
  )

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `QR Fimo - ${name || 'Fimo'}`,
          text: payload,
        })
        return
      } catch (err) {
        // User membatalkan share — jangan error
        if (err instanceof Error && err.name === 'AbortError') return
      }
    }
    await copyPayload()
  }

  const copyPayload = async () => {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      toast.success('QR Fimo disalin ke clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Gagal menyalin. Tunjukkan QR ini langsung ke temanmu.')
    }
  }

  return (
    <div className="bg-card rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.15)] p-5 flex flex-col items-center text-center gap-4">
      <div className="flex items-center gap-2 self-start">
        <QrCode className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          QR Saya
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl border-2 border-black dark:border-white">
        <QRCodeSVG value={payload} size={168} level="M" />
      </div>

      <div>
        <p className="text-sm font-bold text-foreground">{name || 'Nama belum diatur'}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-[260px]">
          Minta teman scan QR ini di menu <span className="font-semibold">Scan QR</span> Fimo
          mereka untuk langsung menambahkanmu sebagai teman bayar.
        </p>
      </div>

      <div className="flex gap-2 w-full">
        <Button onClick={handleShare} className="flex-1 rounded-xl bg-black text-white dark:bg-white dark:text-black hover:opacity-90">
          <Share2 className="h-4 w-4 mr-2" />
          Bagikan
        </Button>
        <Button variant="outline" onClick={copyPayload} className="flex-1 rounded-xl">
          {copied ? (
            <CheckCircle className="h-4 w-4 mr-2 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Salin
        </Button>
      </div>
    </div>
  )
}
