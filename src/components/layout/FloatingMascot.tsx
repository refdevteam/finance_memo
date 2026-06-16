'use client'

import { useState, useEffect } from 'react'
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
  "Butuh tips hemat? Tanya Fimo AI Coach sekarang! 📊",
  "Jangan lupa catat transaksimu hari ini ya! 📝",
  "Hemat pangkal kaya! Kurangi jajan berlebih hari ini. ☕",
  "Sudah cek sisa anggaran belanjamu minggu ini? 📊",
  "Kamu hebat! Mengelola keuangan adalah langkah awal sukses. ✨"
]

export function FloatingMascot() {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard')
  const [showBubble, setShowBubble] = useState(false)
  const [bubbleText, setBubbleText] = useState("")
  const [isWiggling, setIsWiggling] = useState(false)
  const [isAiOpen, setIsAiOpen] = useState(false)

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
    setIsAiOpen(true)
    setShowBubble(false)
  }

  return (
    <>
      <div className={`fixed right-4 md:right-8 z-40 flex flex-col items-end pointer-events-none transition-all duration-300 ${isDashboard ? 'bottom-24' : 'bottom-6'}`}>
        {/* Speech Bubble */}
        <AnimatePresence>
          {showBubble && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="mb-2 max-w-[200px] md:max-w-[240px] bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed relative pointer-events-auto cursor-pointer"
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

        {/* Interactive Mascot */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.5 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1,
            rotate: isWiggling ? [0, -10, 10, -10, 10, 0] : 0
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            rotate: { duration: 0.6, ease: "easeInOut" }
          }}
          onClick={handleMascotClick}
          className="w-14 h-14 md:w-16 md:h-16 cursor-pointer pointer-events-auto relative select-none"
        >
          {/* Gentle Bobbing Container */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-full h-full"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/mascot.png" 
              alt="Fimo Mascot Guide" 
              className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)]"
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Global Fimo AI Coach Dialog */}
      <Dialog open={isAiOpen} onOpenChange={setIsAiOpen}>
        <DialogContent className="max-w-[95%] sm:max-w-[520px] rounded-3xl p-5 bg-slate-50 dark:bg-zinc-900 border-2 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_rgba(255,255,255,0.15)]">
          <DialogHeader className="border-b border-neutral-200 dark:border-zinc-800 pb-3">
            <DialogTitle className="text-base font-extrabold uppercase tracking-wider text-slate-800 dark:text-white flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#8b5cf6] fill-[#8b5cf6]/10 shrink-0" />
              Fimo AI Coach
            </DialogTitle>
          </DialogHeader>
          <div className="pt-2">
            <AICoachCard />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
