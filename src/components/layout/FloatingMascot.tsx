'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles } from 'lucide-react'
import { usePathname } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { AICoachCard } from '@/components/dashboard/AICoachCard'

const GREETINGS = [
  "Yuk, cek kondisi kesehatan keuanganmu dari Fimo AI! ✨",
  "Ada analisis keuangan baru dari Fimo AI. Klik aku! 🤖",
  "Butuh tips hemat? Tanya Fimo AI sekarang! 📊",
  "Jangan lupa catat transaksimu hari ini ya! 📝",
  "Hemat pangkal kaya! Kurangi jajan berlebih hari ini. ☕",
  "Sudah cek sisa anggaran belanjamu minggu ini? 📊",
  "Kamu hebat! Mengelola keuangan adalah langkah awal sukses. ✨"
]

const STORAGE_KEY = 'fimo-mascot-position'
const MASCOT_SIZE = 64 // w-16 h-16 in px

function getSavedPosition(): { x: number; y: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function savePosition(pos: { x: number; y: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
  } catch {
    // ignore
  }
}

export function FloatingMascot() {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard')
  const [showBubble, setShowBubble] = useState(false)
  const [bubbleText, setBubbleText] = useState("")
  const [isWiggling, setIsWiggling] = useState(false)
  const [isAiOpen, setIsAiOpen] = useState(false)

  // Drag state
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const constraintsRef = useRef<HTMLDivElement>(null)

  // Load saved position from localStorage on mount
  useEffect(() => {
    const saved = getSavedPosition()
    if (saved && !isNaN(saved.x) && !isNaN(saved.y)) {
      const maxX = window.innerWidth - MASCOT_SIZE - 32
      const maxY = window.innerHeight - MASCOT_SIZE - 32
      
      setDragPosition({
        x: Math.max(Math.min(saved.x, 0), -maxX),
        y: Math.max(Math.min(saved.y, 0), -maxY),
      })
    }
  }, [])

  // Show a greeting bubble 3 seconds after load
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerGreeting()
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  // Listen for the custom open-fimo-ai event
  useEffect(() => {
    const handleOpenAI = () => {
      setIsAiOpen(true)
      setShowBubble(false)
    }
    window.addEventListener('open-fimo-ai', handleOpenAI)
    return () => window.removeEventListener('open-fimo-ai', handleOpenAI)
  }, [])

  const triggerGreeting = () => {
    const randomIdx = Math.floor(Math.random() * GREETINGS.length)
    setBubbleText(GREETINGS[randomIdx])
    setShowBubble(true)
    setIsWiggling(true)
    setTimeout(() => setIsWiggling(false), 1000)
  }

  // Auto-hide bubble after 7 seconds
  useEffect(() => {
    if (showBubble) {
      const timer = setTimeout(() => {
        setShowBubble(false)
      }, 7000)
      return () => clearTimeout(timer)
    }
  }, [showBubble])

  const handleMascotClick = () => {
    // Only open AI if it was a tap, not the end of a drag
    if (!isDragging) {
      setIsAiOpen(true)
      setShowBubble(false)
    }
  }

  return (
    <>
      {/* Full-screen invisible drag constraint overlay */}
      <div
        ref={constraintsRef}
        className="fixed inset-0 pointer-events-none z-30"
        aria-hidden="true"
      />

      <div className={`fixed right-4 md:right-8 z-40 flex flex-col items-end pointer-events-none transition-none ${isDashboard ? 'bottom-24' : 'bottom-6'}`}>
        {/* Speech Bubble — positioned relative to mascot, only shown when not dragging */}
        <AnimatePresence>
          {showBubble && !isDragging && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mb-2 max-w-[200px] md:max-w-[240px] bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 p-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed relative pointer-events-auto cursor-pointer"
              onClick={handleMascotClick}
            >
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowBubble(false)
                }}
                className="absolute top-1.5 right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors border-none bg-transparent"
              >
                <X className="h-3 w-3" />
              </button>
              <p className="pr-3 font-semibold">{bubbleText}</p>
              {/* Bubble Tail */}
              <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white dark:bg-zinc-900 border-r border-b border-indigo-100 dark:border-zinc-800 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Mascot — Draggable */}
        <motion.div
          drag
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 300, bounceDamping: 30 }}
          animate={{
            rotate: isWiggling ? [0, -10, 10, -10, 10, 0] : 0,
            scale: 1,
            opacity: 1,
          }}
          whileHover={{ scale: isDragging ? 1 : 1.05 }}
          whileTap={{ scale: 0.95 }}
          whileDrag={{ scale: 1.1, cursor: 'grabbing' }}
          initial={{ opacity: 0, scale: 0.5 }}
          onAnimationComplete={() => {}}
          onDragStart={() => {
            setIsDragging(true)
            dragStartPos.current = { ...dragPosition }
            setShowBubble(false)
          }}
          onDragEnd={(_, info) => {
            // Save final position (offset from default bottom-right anchor)
            const newPos = {
              x: dragPosition.x + info.offset.x,
              y: dragPosition.y + info.offset.y,
            }
            setDragPosition(newPos)
            savePosition(newPos)
            // Use a small timeout so click event doesn't fire after drag
            setTimeout(() => setIsDragging(false), 100)
          }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            rotate: { duration: 0.6, ease: "easeInOut" }
          }}
          onClick={handleMascotClick}
          className="w-14 h-14 md:w-16 md:h-16 cursor-grab active:cursor-grabbing pointer-events-auto relative select-none touch-none"
          style={{ x: dragPosition.x, y: dragPosition.y }}
          title="Seret untuk memindahkan • Ketuk untuk membuka Fimo AI"
        >
          {/* Gentle Bobbing Container — stops bobbing while dragging */}
          <motion.div
            animate={isDragging ? { y: 0 } : { y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mascot.png"
              alt="Fimo Mascot Guide — seret untuk memindahkan"
              className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
              draggable={false}
            />
          </motion.div>

          {/* Drag hint tooltip — shown on first render for a few seconds */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
            transition={{ duration: 3, delay: 1, times: [0, 0.1, 0.8, 1] }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[9px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none"
          >
            Seret untuk pindah
          </motion.div>
        </motion.div>
      </div>

      {/* Global Fimo AI Coach Dialog */}
      <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
        <DialogContent className="max-w-[92vw] sm:max-w-[520px] rounded-3xl p-4 sm:p-5 bg-slate-50 dark:bg-zinc-900 border-2 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.15)] overflow-hidden">
          <DialogHeader className="border-b border-neutral-200 dark:border-zinc-800 pb-3">
            <DialogTitle className="text-base font-extrabold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#8b5cf6] fill-[#8b5cf6]/10 shrink-0" />
              Fimo AI
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2 w-full max-w-full min-w-0 overflow-hidden">
            <AICoachCard hidePlanTab />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
