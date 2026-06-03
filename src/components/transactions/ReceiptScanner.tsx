'use client'

import { useState, useRef } from 'react'
import { Camera, X, Loader2, Sparkles, CheckCircle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { InlineSelect } from '@/components/ui/inline-select'
import { addTransaction } from '@/actions/transactions'
import { markReceiptProcessed } from '@/actions/receipts'

const schema = z.object({
  wallet_id: z.string().min(1, 'Dompet wajib dipilih'),
  category_id: z.string().nullable().optional(),
  amount: z.number().min(1, 'Jumlah transaksi harus lebih dari 0'),
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  transaction_date: z.string().min(1, 'Tanggal wajib diisi'),
  receipt_id: z.string().optional(),
})

type ReceiptData = z.infer<typeof schema>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ReceiptScanner({ wallets, categories }: { wallets: any[], categories: any[] }) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [scanResult, setScanResult] = useState<any | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, control, reset, setValue, formState: { errors } } = useForm<ReceiptData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      amount: 0,
      description: '',
      transaction_date: new Date().toISOString().split('T')[0]
    }
  })

  // Options for Wallets & Categories
  const walletOptions = wallets.map(w => ({ value: w.id, label: w.name }))
  const categoryOptions = categories
    .filter(c => c.type === (scanResult?.suggested_type || 'expense'))
    .map(c => ({ value: c.id, label: c.name }))

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal adalah 5MB')
        return
      }
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setScanResult(null)
    }
  }

  const handleScan = async () => {
    if (!file) return
    setIsScanning(true)
    
    try {
      const formData = new FormData()
      formData.append('receipt', file)

      const response = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Gagal memindai struk')
      }

      setScanResult(data.data)
      
      // Auto-fill form
      setValue('amount', data.data.total_amount)
      setValue('description', data.data.merchant_name)
      if (data.data.receipt_date) {
        setValue('transaction_date', data.data.receipt_date)
      }
      setValue('type', data.data.suggested_type || 'expense')
      setValue('receipt_id', data.receipt_id)

      // Try to auto match category based on suggested_category_name
      if (data.data.suggested_category_name) {
        const matchedCat = categories.find(c => 
          c.name.toLowerCase().includes(data.data.suggested_category_name.toLowerCase()) ||
          data.data.suggested_category_name.toLowerCase().includes(c.name.toLowerCase())
        )
        if (matchedCat) {
          setValue('category_id', matchedCat.id)
        }
      }
      
      toast.success('Struk berhasil dibaca!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsScanning(false)
    }
  }

  const onSubmit = async (data: ReceiptData) => {
    setIsSaving(true)
    try {
      // 1. Simpan Transaksi
      const res = await addTransaction({
        wallet_id: data.wallet_id,
        category_id: data.category_id || '',
        amount: data.amount,
        type: data.type,
        description: data.description,
        transaction_date: data.transaction_date,
      })

      if (!res?.success) throw new Error(res?.error || 'Gagal menyimpan transaksi')

      // 2. Update status receipt menjadi is_processed = true
      if (data.receipt_id) {
        await markReceiptProcessed(data.receipt_id)
      }

      toast.success('Transaksi berhasil disimpan')
      handleClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan transaksi')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setFile(null)
    setPreviewUrl(null)
    setScanResult(null)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v ? handleClose() : setOpen(true)}>
      <DialogTrigger
        render={
          <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 text-white gap-2">
            <Sparkles className="h-4 w-4" />
            AI Scan Struk
          </Button>
        }
      />
      
      <DialogContent className="sm:max-w-[500px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            AI Receipt Scanner
          </DialogTitle>
          <DialogDescription>
            Unggah foto struk belanja Anda, dan AI akan mengisikan form transaksi otomatis untuk Anda.
          </DialogDescription>
        </DialogHeader>

        {!scanResult ? (
          <div className="space-y-4 pt-4">
            {/* Upload Area */}
            <div 
              className={`
                border-2 border-dashed rounded-2xl p-6 text-center transition-colors relative
                ${previewUrl ? 'border-primary bg-secondary/30 dark:border-white' : 'border-border'}
                ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
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
              
              {previewUrl ? (
                <div className="relative w-full max-w-[200px] mx-auto h-auto rounded-lg overflow-hidden shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview" className="w-full h-auto object-cover" />
                  {!isScanning && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setFile(null); setPreviewUrl(null); }}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="grid grid-cols-2 gap-4 w-full">
                    {/* Kamera Card */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isScanning) cameraInputRef.current?.click();
                      }}
                      className="flex flex-col items-center justify-center p-6 bg-secondary hover:bg-accent border border-border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] duration-200"
                    >
                      <div className="h-12 w-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-3 shadow-sm">
                        <Camera className="h-6 w-6" />
                      </div>
                      <span className="font-semibold text-foreground text-sm">Ambil Foto</span>
                      <span className="text-[10px] text-muted-foreground mt-1">Gunakan Kamera HP</span>
                    </div>
 
                    {/* Galeri Card */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isScanning) fileInputRef.current?.click();
                      }}
                      className="flex flex-col items-center justify-center p-6 bg-secondary/50 hover:bg-accent border border-border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] duration-200"
                    >
                      <div className="h-12 w-12 bg-accent text-foreground rounded-full flex items-center justify-center mb-3">
                        <Upload className="h-6 w-6" />
                      </div>
                      <span className="font-semibold text-foreground text-sm">Pilih Galeri</span>
                      <span className="text-[10px] text-muted-foreground mt-1">JPG, PNG maks 5MB</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Mendukung unggahan langsung via kamera atau file gambar</p>
                </div>
              )}
            </div>

            <Button 
              onClick={handleScan} 
              disabled={!file || isScanning} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-12"
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Sedang membaca struk...
                </>
              ) : (
                'Mulai Pindai Struk'
              )}
            </Button>
          </div>
        ) : (
          /* Hasil Scan & Form */
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800 flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Struk berhasil diekstrak!</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Silakan periksa kembali data di bawah ini sebelum menyimpan.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Merchant / Deskripsi</Label>
              <Input 
                id="description" 
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Total Amount (Rp)</Label>
                <Input 
                  id="amount" 
                  type="number"
                  {...register('amount', { valueAsNumber: true })}
                  className={errors.amount ? 'border-destructive' : ''}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction_date">Tanggal</Label>
                <Input 
                  id="transaction_date" 
                  type="date"
                  {...register('transaction_date')}
                  className={errors.transaction_date ? 'border-destructive' : ''}
                />
                {errors.transaction_date && <p className="text-xs text-destructive">{errors.transaction_date.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dompet</Label>
              <Controller
                name="wallet_id"
                control={control}
                render={({ field }) => (
                  <InlineSelect
                    options={walletOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pilih dompet"
                    error={!!errors.wallet_id}
                  />
                )}
              />
              {errors.wallet_id && <p className="text-xs text-destructive mt-1">{errors.wallet_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Kategori (Opsional)</Label>
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <InlineSelect
                    options={categoryOptions}
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Pilih kategori"
                  />
                )}
              />
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="w-1/3" onClick={() => setScanResult(null)}>
                Batal
              </Button>
              <Button type="submit" className="w-2/3 bg-emerald-600 hover:bg-emerald-700" disabled={isSaving}>
                {isSaving ? 'Menyimpan...' : 'Simpan Transaksi'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
