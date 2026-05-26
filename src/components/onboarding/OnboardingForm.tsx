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

const schema = z.object({
  full_name: z.string().min(1, 'Nama lengkap wajib diisi'),
  currency: z.string().min(1, 'Mata uang wajib dipilih'),
  timezone: z.string().min(1, 'Zona waktu wajib dipilih'),
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
    <Card className="w-full max-w-lg mx-auto shadow-xl border-none bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <CardHeader>
        <div className="flex justify-between items-center mb-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-2 flex-1 mx-1 rounded-full transition-all duration-500 ${
                i <= step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
        <CardTitle className="text-2xl font-bold">
          {step === 1 && 'Tentang Kamu'}
          {step === 2 && 'Preferensi Keuangan'}
          {step === 3 && 'Siap Memulai?'}
        </CardTitle>
        <CardDescription>
          {step === 1 && 'Beritahu kami nama kamu untuk mempersonalisasi pengalaman kamu.'}
          {step === 2 && 'Atur mata uang dan zona waktu default kamu.'}
          {step === 3 && 'Konfirmasi data kamu dan mari mulai mengelola keuangan.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 min-h-[200px]">
        {step === 1 && (
          <div className="space-y-2">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input
              id="full_name"
              placeholder="Masukkan nama lengkap kamu"
              {...register('full_name')}
              className={errors.full_name ? 'border-destructive' : ''}
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mata Uang</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Mata Uang" />
                    </SelectTrigger>
                    <SelectContent>
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
              <Label>Zona Waktu</Label>
              <Controller
                name="timezone"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Zona Waktu" />
                    </SelectTrigger>
                    <SelectContent>
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
          <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Nama:</span>
              <span className="font-medium">{formData.full_name}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Mata Uang:</span>
              <span className="font-medium">{formData.currency}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Zona Waktu:</span>
              <span className="font-medium">{formData.timezone}</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={step === 1 || isSubmitting}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Kembali
        </Button>
        {step < 3 ? (
          <Button type="button" onClick={nextStep}>
            Lanjut <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
  )
}
