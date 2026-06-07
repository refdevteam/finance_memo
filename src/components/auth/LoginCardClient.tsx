'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { GoogleLoginButton } from '@/components/auth/GoogleLoginButton'

export function LoginCardClient() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-md relative z-10 px-4"
    >
      {/* Bobbing Mascot sitting on top of the card */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20">
        <motion.img 
          src="/mascot.png" 
          alt="Fimo Mascot" 
          className="w-28 h-28 object-contain drop-shadow-[0_10px_15px_rgba(0,0,0,0.15)]"
          animate={{ 
            y: [0, -10, 0],
            rotate: [0, 3, -3, 0] 
          }}
          transition={{ 
            duration: 5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>

      <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md bg-white/85 dark:bg-slate-900/80 rounded-3xl overflow-hidden mt-8">
        <CardHeader className="text-center space-y-2 pt-10">
          <div className="flex justify-center mb-2">
            <div className="flex items-center space-x-2">
              <motion.img
                src="/logo-circle.png"
                alt="Fimo Logo"
                className="w-10 h-10 object-contain rounded-full shadow-md"
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              />
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">fimo</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Selamat Datang
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
            Kelola keuangan pribadi Anda dengan bantuan AI
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pb-8">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <GoogleLoginButton />
          </motion.div>
          
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200 dark:border-slate-800/80" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-mono">
              <span className="bg-transparent px-2 text-slate-400 dark:text-slate-500">
                Aman & Terenkripsi
              </span>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 px-8 leading-relaxed">
            Dengan melanjutkan, Anda menyetujui Ketentuan Layanan dan Kebijakan Privasi kami.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
