'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const GREETINGS = [
  "Jangan lupa catat transaksimu hari ini ya! 📝",
  "Hemat pangkal kaya! Kurangi jajan berlebih hari ini. ☕",
  "Sudah cek sisa anggaran belanjamu minggu ini? 📊",
  "Kamu hebat! Mengelola keuangan adalah langkah awal sukses. ✨",
  "Fimo selalu siap membantumu melacak setiap pengeluaran. 🐱",
  "Pisahkan rekening tabungan dan belanja harianmu ya! 💳",
  "Setiap rupiah yang kamu hemat adalah investasi masa depanmu! 💰"
]

export function FloatingMascot() {
  const [showBubble, setShowBubble] = useState(false)
  const [bubbleText, setBubbleText] = useState("")
  const [isWiggling, setIsWiggling] = useState(false)

  // Show a greeting bubble 3 seconds after load
  useEffect(() => {
    const timer = setTimeout(() => {
      triggerGreeting()
    }, 3000)
    return () => clearTimeout(timer)
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

  return (
    <div className="fixed bottom-24 right-4 md:right-8 z-40 flex flex-col items-end pointer-events-none">
      {/* Speech Bubble */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="mb-2 max-w-[200px] md:max-w-[240px] bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-slate-700 dark:text-slate-200 text-[11px] leading-relaxed relative pointer-events-auto"
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowBubble(false)}
              className="absolute top-1.5 right-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
            <p className="pr-3 font-medium">{bubbleText}</p>
            {/* Bubble Tail */}
            <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-white dark:bg-slate-900 border-r border-b border-indigo-100 dark:border-indigo-950 rotate-45" />
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
        onClick={triggerGreeting}
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
  )
}
