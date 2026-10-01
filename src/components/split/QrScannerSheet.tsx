'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, Upload, Loader2, ScanLine, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { toast } from 'sonner'

export interface QrScanResult {
  valid: boolean
  partner_user_id?: string
  name?: string
  avatar_url?: string
  raw?: string
}

function parseQrPayload(text: string): QrScanResult {
  try {
    const data = JSON.parse(text)
    if (data && data.t === 'fimo_user' && typeof data.id === 'string' && data.id.length > 0) {
      return {
        valid: true,
        partner_user_id: data.id,
        name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : '',
        avatar_url: typeof data.avatar === 'string' ? data.avatar : undefined,
      }
    }
  } catch {
    // Bukan JSON — jatuh ke hasil tidak valid
  }
  return { valid: false, raw: text }
}

export function QrScannerSheet({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onResult: (result: QrScanResult) => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [cameraError, setCameraError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [starting, setStarting] = useState(false)

  const stopCamera = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraReady(false)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const finish = useCallback(
    (text: string) => {
      stopCamera()
      onResult(parseQrPayload(text))
      onOpenChange(false)
    },
    [onOpenChange, onResult, stopCamera]
  )

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const width = video.videoWidth
      const height = video.videoHeight
      if (width > 0 && height > 0) {
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height)
          const imageData = ctx.getImageData(0, 0, width, height)
          const code = jsQR(imageData.data, width, height, { inversionAttempts: 'dontInvert' })
          if (code && code.data) {
            finish(code.data)
            return
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [finish])

  const startCamera = useCallback(async () => {
    setStarting(true)
    setCameraError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported')
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraReady(true)
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(tick)
      }
    } catch {
      setCameraError('Kamera tidak dapat diakses. Gunakan foto/galeri di bawah.')
    } finally {
      setStarting(false)
    }
  }, [tick])

  // Start / stop kamera mengikuti state open
  useEffect(() => {
    if (open) {
      startCamera()
    } else {
      stopCamera()
    }
    return stopCamera
  }, [open, startCamera, stopCamera])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal adalah 5MB')
      return
    }

    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = () => reject(new Error('Gambar tidak valid'))
        img.src = url
      })

      const canvas = canvasRef.current || document.createElement('canvas')
      const width = img.naturalWidth
      const height = img.naturalHeight
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx || !width || !height) throw new Error('Gagal membaca gambar')
      ctx.drawImage(img, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const code = jsQR(imageData.data, width, height)
      if (!code || !code.data) {
        toast.error('QR tidak ditemukan pada gambar')
        return
      }
      finish(code.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memindai gambar')
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl p-6 bg-white dark:bg-neutral-950 border-t-2 border-l-2 border-r-2 border-black dark:border-white shadow-[0_-6px_0px_rgba(0,0,0,1)] dark:shadow-[0_-6px_0px_rgba(255,255,255,0.15)] max-h-[90vh] overflow-y-auto"
      >
        <SheetHeader className="text-center pb-2">
          <SheetTitle className="text-lg font-bold flex items-center justify-center gap-2">
            <ScanLine className="h-5 w-5" />
            Scan QR Teman
          </SheetTitle>
          <SheetDescription className="text-xs text-neutral-500 dark:text-neutral-400">
            Arahkan kamera ke QR Fimo temanmu, atau pilih foto QR dari galeri.
          </SheetDescription>
        </SheetHeader>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        <div className="py-3 space-y-4">
          {/* Live camera preview */}
          <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden border-2 border-black dark:border-white bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Corner brackets */}
            <div className="absolute inset-6 border-2 border-white/70 rounded-xl pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {starting && (
                <div className="bg-black/60 text-white px-3 py-2 rounded-full text-xs flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Memulai kamera...
                </div>
              )}
            </div>
            {!starting && !cameraError && !cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-xs text-center px-6">
                Menunggu kamera...
              </div>
            )}
          </div>

          {cameraError && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-400">{cameraError}</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              atau pilih gambar
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-4 bg-secondary hover:bg-accent border border-border rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="h-10 w-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-2">
                <Camera className="h-5 w-5" />
              </div>
              <span className="font-semibold text-foreground text-xs">Ambil Foto</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">QR via kamera HP</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-4 bg-secondary/50 hover:bg-accent border border-border rounded-xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="h-10 w-10 bg-accent text-foreground rounded-full flex items-center justify-center mb-2">
                <Upload className="h-5 w-5" />
              </div>
              <span className="font-semibold text-foreground text-xs">Pilih Galeri</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG maks 5MB</span>
            </button>
          </div>

          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </SheetContent>
    </Sheet>
  )
}
