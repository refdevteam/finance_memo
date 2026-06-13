'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { completeOnboarding } from '@/actions/profile'
import { ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const schema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  currency: z.string().min(1, 'Mata uang wajib dipilih'),
  timezone: z.string().min(1, 'Zona waktu wajib dipilih'),
  wallet_name: z.string().min(1, 'Nama dompet wajib diisi'),
  wallet_type: z.enum(['cash', 'bank', 'ewallet', 'investment', 'other']),
  wallet_balance: z.number().nonnegative('Saldo awal tidak boleh negatif'),
})

type OnboardingData = z.infer<typeof schema>

export function OnboardingForm({ initialData }: { initialData?: Partial<OnboardingData> }) {
  const [step, setStep] = useState(1)
  const { register, handleSubmit, control, watch, trigger, formState: { errors, isSubmitting } } = useForm<OnboardingData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: initialData?.full_name || '',
      currency: initialData?.currency || 'IDR',
      timezone: initialData?.timezone || 'Asia/Jakarta',
      wallet_name: 'Dompet Utama',
      wallet_type: 'cash',
      wallet_balance: 0,
    },
  })

  // Watch values for summary screen
  const formData = watch()

  const nextStep = async () => {
    if (step === 1) {
      const isValid = await trigger('full_name')
      if (!isValid) {
        toast.error('Tunggu, nama lengkap belum diisi dengan benar!')
        return
      }
    }
    if (step === 2) {
      const isCurrencyValid = await trigger('currency')
      const isTimezoneValid = await trigger('timezone')
      if (!isCurrencyValid || !isTimezoneValid) {
        toast.error('Silakan tentukan preferensi mata uang dan zona waktu!')
        return
      }
    }
    if (step === 3) {
      const isNameValid = await trigger('wallet_name')
      const isTypeValid = await trigger('wallet_type')
      const isBalanceValid = await trigger('wallet_balance')
      if (!isNameValid || !isTypeValid || !isBalanceValid) {
        toast.error('Silakan isi kelengkapan data dompet pertama Anda!')
        return
      }
    }
    setStep((s) => s + 1)
  }
  const prevStep = () => setStep((s) => s - 1)

  const onSubmit = async (data: OnboardingData) => {
    try {
      const result = await completeOnboarding(data)
      if (result?.error) {
        toast.error(result.error)
      }
    } catch (error) {
      // Redirect throws an error which is fine, but we catch other actual errors
      if (!(error instanceof Error && error.message.includes('NEXT_REDIRECT'))) {
        toast.error('Terjadi kesalahan yang tidak terduga.')
      }
    }
  }

  return (
    <div className="relative w-full max-w-lg mx-auto mt-12 px-4">
      {/* Floating Mascot sitting on top of the Onboarding Card */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 z-20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img 
          src="/mascot.png" 
          alt="Fimo Mascot Guide" 
          className="w-24 h-24 object-contain drop-shadow-md"
          animate={{ 
            y: [0, -8, 0],
            rotate: [0, 2, -2, 0] 
          }}
          transition={{ 
            duration: 4, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        />
      </div>

      <Card className="w-full shadow-2xl border-none bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-3xl overflow-hidden pt-8">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 mx-1 rounded-full transition-all duration-500 ${
                  i <= step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'
                }`}
              />
            ))}
          </div>
          <CardTitle className="text-2xl font-black tracking-tight">
            {step === 1 && 'Tentang Kamu'}
            {step === 2 && 'Preferensi Keuangan'}
            {step === 3 && 'Buat Dompet Pertama Kamu'}
            {step === 4 && 'Siap Memulai?'}
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 text-sm">
            {step === 1 && 'Beritahu kami nama kamu untuk mempersonalisasi pengalaman kamu.'}
            {step === 2 && 'Atur mata uang dan zona waktu default kamu.'}
            {step === 3 && 'Dompet ini akan menjadi tempat utama untuk mencatat saldo dan transaksi awal Anda.'}
            {step === 4 && 'Konfirmasi data kamu dan mari mulai mengelola keuangan.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 min-h-[220px] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {step === 1 && (
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-sm font-semibold">Nama Lengkap</Label>
                  <Input
                    id="full_name"
                    placeholder="Masukkan nama lengkap kamu"
                    {...register('full_name')}
                    className={cn(
                      "rounded-xl border-slate-200 dark:border-slate-800",
                      errors.full_name ? 'border-destructive' : ''
                    )}
                  />
                  {errors.full_name && (
                    <p className="text-xs text-destructive">{errors.full_name.message}</p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Mata Uang</Label>
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Pilih Mata Uang" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="IDR">IDR - Rupiah Indonesia</SelectItem>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Zona Waktu</Label>
                    <Controller
                      name="timezone"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Pilih Zona Waktu" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Asia/Jakarta">WIB - Jakarta (UTC+7)</SelectItem>
                            <SelectItem value="Asia/Makassar">WITA - Makassar (UTC+8)</SelectItem>
                            <SelectItem value="Asia/Jayapura">WIT - Jayapura (UTC+9)</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="wallet_name" className="text-sm font-semibold">Nama Dompet</Label>
                    <Input
                      id="wallet_name"
                      placeholder="Contoh: Dompet Utama, Cash, Bank Mandiri"
                      {...register('wallet_name')}
                      className={cn(
                        "rounded-xl border-slate-200 dark:border-slate-800",
                        errors.wallet_name ? 'border-destructive' : ''
                      )}
                    />
                    {errors.wallet_name && (
                      <p className="text-xs text-destructive">{errors.wallet_name.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Jenis Dompet</Label>
                    <Controller
                      name="wallet_type"
                      control={control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800">
                            <SelectValue placeholder="Pilih Jenis Dompet" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="cash">💵 Cash / Uang Tunai</SelectItem>
                            <SelectItem value="bank">🏦 Bank / Rekening</SelectItem>
                            <SelectItem value="ewallet">📱 E-Wallet / Dompet Digital</SelectItem>
                            <SelectItem value="investment">📈 Investasi</SelectItem>
                            <SelectItem value="other">📦 Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.wallet_type && (
                      <p className="text-xs text-destructive">{errors.wallet_type.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="wallet_balance" className="text-sm font-semibold">Saldo Awal</Label>
                    <Input
                      id="wallet_balance"
                      type="number"
                      placeholder="Masukkan saldo awal dompet"
                      {...register('wallet_balance', { valueAsNumber: true })}
                      className={cn(
                        "rounded-xl border-slate-200 dark:border-slate-800",
                        errors.wallet_balance ? 'border-destructive' : ''
                      )}
                    />
                    {errors.wallet_balance && (
                      <p className="text-xs text-destructive">{errors.wallet_balance.message}</p>
                    )}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-3 bg-slate-50 dark:bg-zinc-900/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 shadow-inner">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Nama:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formData.full_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Mata Uang:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formData.currency}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Zona Waktu:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formData.timezone}</span>
                  </div>
                  <div className="border-t border-slate-200/50 dark:border-slate-700/50 my-2 pt-2" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Dompet Pertama:</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{formData.wallet_name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Jenis Dompet:</span>
                    <span className="font-semibold uppercase text-neutral-800 dark:text-neutral-200">{formData.wallet_type}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Saldo Awal:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: formData.currency || 'IDR',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(Number(formData.wallet_balance || 0))}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 1 || isSubmitting}
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Kembali
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={nextStep}>
              Lanjut <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
            >
              {isSubmitting ? 'Menyimpan...' : (
                <>
                  Selesai <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

