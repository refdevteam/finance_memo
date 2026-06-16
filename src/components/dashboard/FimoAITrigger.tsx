'use client'

import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export function FimoAITrigger() {
  const handleTrigger = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-fimo-ai'))
    }
  }

  return (
    <Button
      onClick={handleTrigger}
      className="md:hidden bg-[#c5b0f4] hover:bg-[#b09be8] text-black border-2 border-black font-extrabold text-xs rounded-full px-3.5 h-9 shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(255,255,255,0.15)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1.5 shrink-0 border-solid"
    >
      <Sparkles className="h-3.5 w-3.5 text-black shrink-0 animate-pulse fill-black/10" />
      <span>Fimo AI</span>
    </Button>
  )
}
