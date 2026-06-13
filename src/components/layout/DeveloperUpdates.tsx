'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Calendar, CheckCircle, ArrowRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface UpdateItem {
  category: 'baru' | 'peningkatan'
  text: string
  details?: string
}

// Helper to filter out development/sensitive updates and translate technical jargon to friendly Indonesian
const cleanAndFormatText = (text: string): { category: 'baru' | 'peningkatan'; text: string } | null => {
  let cleaned = text.trim()
  
  if (!cleaned) return null

  // 1. Filter out development or sensitive details
  const filterKeywords = [
    'vercel', 'build', 'ci', 'cd', 'config', 'ignore', 'lint', 'env', 'secret',
    'key', 'db migration', 'migration', 'deployment', 'deploy', 'test', 'setup',
    'npm', 'package', 'dependency', 'webpack', 'hotfix', 'pipeline', 'credentials',
    'token', 'auth config', 'api key', 'password', 'supabase trigger', 'schema',
    'github workflow', 'eslint', 'compile error', 'syntax error'
  ]
  const lowerText = cleaned.toLowerCase()
  if (filterKeywords.some(keyword => lowerText.includes(keyword))) {
    return null
  }

  // 2. Detect and strip prefixes (feat:, fix:, chore:, refactor:, etc.)
  let category: 'baru' | 'peningkatan' = 'baru'
  
  if (/^(feat|feature|baru):/i.test(cleaned)) {
    category = 'baru'
    cleaned = cleaned.replace(/^(feat|feature|baru):/i, '')
  } else if (/^(fix|bug|perbaikan|peningkatan):/i.test(cleaned)) {
    category = 'peningkatan'
    cleaned = cleaned.replace(/^(fix|bug|perbaikan|peningkatan):/i, '')
  } else if (/^(refactor|style|perf|chore):/i.test(cleaned)) {
    category = 'peningkatan'
    cleaned = cleaned.replace(/^(refactor|style|perf|chore):/i, '')
  }

  cleaned = cleaned.trim()

  // 3. Translate technical terms into friendly Indonesian
  const translations: [RegExp, string][] = [
    [/mobile/gi, 'HP'],
    [/wallet/gi, 'dompet'],
    [/budget/gi, 'anggaran'],
    [/transaction/gi, 'transaksi'],
    [/chart|graph/gi, 'grafik'],
    [/auth|login/gi, 'masuk akun'],
    [/streak/gi, 'streak catatan'],
    [/UI|design/gi, 'tampilan'],
    [/button/gi, 'tombol'],
    [/error|crash/gi, 'kendala'],
    [/optimize|optimization/gi, 'optimalisasi'],
    [/caching|cache/gi, 'penyimpanan sementara'],
    [/mascot/gi, 'maskot Fimo']
  ]

  translations.forEach(([regex, replacer]) => {
    cleaned = cleaned.replace(regex, replacer)
  })

  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)

  return {
    category,
    text: cleaned
  }
}

// Helper to parse GitHub release body into styled items
const parseReleaseBody = (body: string) => {
  if (!body) return []
  const lines = body.split('\n')
  let currentCategory: 'baru' | 'peningkatan' = 'baru'
  const items: { category: 'baru' | 'peningkatan'; text: string; details?: string }[] = []
  
  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return
    
    // Detect section headers (including 'feat' and 'fix')
    const lower = trimmed.toLowerCase()
    if (lower.includes('baru') || lower.includes('added') || lower.includes('features') || lower.includes('feat')) {
      currentCategory = 'baru'
      return
    }
    if (lower.includes('peningkatan') || lower.includes('improved') || lower.includes('fixed') || lower.includes('perbaikan') || lower.includes('fix')) {
      currentCategory = 'peningkatan'
      return
    }
    
    // Match bullet points: - item, * item, or 1. item
    if (trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) {
      const textOnly = trimmed.replace(/^[-*\s]+|^\d+\.\s*/, '')
      const cleanedObj = cleanAndFormatText(textOnly)
      if (cleanedObj) {
        items.push({
          category: cleanedObj.category || currentCategory,
          text: cleanedObj.text
        })
      }
    }
  })
  
  return items
}

export function DeveloperUpdates({ asSidebarItem = false }: { asSidebarItem?: boolean }) {
  const [open, setOpen] = useState(false)
  const [updates, setUpdates] = useState<UpdateItem[]>([])
  const [version, setVersion] = useState('v1.3.0')
  const [dateStr, setDateStr] = useState('9 Juni 2026')
  const [hasNewUpdate, setHasNewUpdate] = useState(false)

  useEffect(() => {
    async function fetchUpdates() {
      try {
        // Try fetching from GitHub releases first
        const gitRes = await fetch('https://api.github.com/repos/refdevteam/finance_memo/releases')
        if (gitRes.ok) {
          const gitData = await gitRes.json()
          if (Array.isArray(gitData) && gitData.length > 0) {
            const latestRelease = gitData[0]
            const items = parseReleaseBody(latestRelease.body || '')
            
            if (items.length > 0) {
              setUpdates(items)
            } else {
              // fallback if body has no bullet points
              const cleanedObj = cleanAndFormatText(latestRelease.name || 'Pembaruan Fimo Baru')
              setUpdates([
                { 
                  category: cleanedObj?.category || 'baru', 
                  text: cleanedObj?.text || latestRelease.name || 'Pembaruan Fimo Baru', 
                  details: latestRelease.body ? cleanAndFormatText(latestRelease.body)?.text : undefined 
                }
              ])
            }
            
            setVersion(latestRelease.tag_name || 'v1.3.0')
            
            if (latestRelease.published_at) {
              const date = new Date(latestRelease.published_at)
              const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
              setDateStr(date.toLocaleDateString('id-ID', options))
            }
            
            const viewedVersion = localStorage.getItem('fimo_viewed_version')
            if (viewedVersion !== latestRelease.tag_name) {
              setHasNewUpdate(true)
            }
            return
          }
        }
      } catch (err) {
        console.warn('GitHub releases fetch failed, falling back to updates.json:', err)
      }

      // Fallback to local updates.json
      try {
        const res = await fetch('/updates.json')
        if (res.ok) {
          const data = await res.json()
          setUpdates(data.items || [])
          setVersion(data.version || 'v1.3.0')
          setDateStr(data.date || '')
          
          const viewedVersion = localStorage.getItem('fimo_viewed_version')
          if (viewedVersion !== data.version) {
            setHasNewUpdate(true)
          }
        }
      } catch (err) {
        console.error('Failed to fetch fallback updates:', err)
      }
    }
    fetchUpdates()
  }, [])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setHasNewUpdate(false)
      if (version) {
        localStorage.setItem('fimo_viewed_version', version)
      }
    }
  }

  const getBadgeColor = (category: string) => {
    switch (category) {
      case 'baru':
        return 'bg-[#c8e6cd]/60 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-500/20'
      case 'peningkatan':
        return 'bg-[#c5b0f4]/30 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-500/20'
      default:
        return 'bg-neutral-500/10 text-neutral-600 border-neutral-500/20'
    }
  }

  const getBadgeLabel = (category: string) => {
    switch (category) {
      case 'baru':
        return 'Baru'
      case 'peningkatan':
        return 'Peningkatan'
      default:
        return category
    }
  }

  const triggerButton = asSidebarItem ? (
    <Button
      variant="ghost"
      className="w-full flex items-center justify-start space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900 transition-all relative"
    >
      <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
      <span className="flex-1 text-left">Info Pembaruan</span>
      {hasNewUpdate && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      )}
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 relative"
      aria-label="Developer Updates"
    >
      <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400" />
      {hasNewUpdate && (
        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
      )}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={triggerButton} />
      <DialogContent className="sm:max-w-[480px] w-[92vw] overflow-y-auto max-h-[85vh] rounded-2xl p-4 sm:p-6 md:p-8 bg-white dark:bg-zinc-900 border-2 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.15)]">
        <DialogHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                Informasi Pembaruan
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Rangkuman fitur baru & peningkatan sistem Fimo
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-5">
          {/* Release version & timestamp */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-50 dark:bg-zinc-900/30 p-3 rounded-xl border-2 border-black dark:border-neutral-700">
            <div className="flex items-center space-x-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <Badge variant="outline" className="bg-[#f3c9b6]/30 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-500/20 font-bold px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase">
                {version}
              </Badge>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">Versi Terbaru</span>
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
              <Calendar className="h-3.5 w-3.5 mr-0.5" />
              <span>{dateStr}</span>
            </div>
          </div>

          {/* List of updates */}
          {updates.length > 0 ? (
            <div className="space-y-3.5 max-h-[40vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-zinc-800">
              {updates.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3.5 rounded-xl bg-white dark:bg-zinc-900 border-2 border-black dark:border-neutral-700 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0px_rgba(0,0,0,1)] transition-all duration-150"
                >
                  <div className="mt-0.5 shrink-0">
                    <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 leading-tight">
                        {item.text}
                      </span>
                      <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border font-semibold rounded-md ${getBadgeColor(item.category)}`}>
                        {getBadgeLabel(item.category)}
                      </Badge>
                    </div>
                    {item.details && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-6">
              Tidak ada detail pembaruan ramah-pengguna untuk versi ini.
            </p>
          )}

          {/* Link to GitHub Releases */}
          <div className="pt-3 text-center border-t border-neutral-100 dark:border-neutral-800/80">
            <a 
              href="https://github.com/refdevteam/finance_memo/releases" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[10px] font-bold text-indigo-650 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              Lihat Riwayat Pembaruan di GitHub →
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800/80 flex justify-end">
          <Button
            onClick={() => setOpen(false)}
            className="rounded-full bg-black hover:bg-neutral-900 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-black text-xs font-bold px-5 py-2.5 flex items-center transition-all"
          >
            Mengerti <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
