'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Wallet, 
  Globe, 
  Smartphone, 
  Loader2, 
  Bell, 
  AlertCircle,
  Download,
  Trash2,
  ShieldAlert
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateProfile } from '@/actions/profile'
import { updateFcmToken } from '@/actions/notifications'
import { getFirebaseToken } from '@/lib/firebase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { exportUserData, deleteUserAccount } from '@/actions/gdpr'

interface Profile {
  id: string
  full_name: string | null
  currency: string
  timezone: string
  fcm_token: string | null
}

interface SettingsClientProps {
  profile: Profile | null
}

export function SettingsClient({ profile }: SettingsClientProps) {
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [currency, setCurrency] = useState(profile?.currency || 'IDR')
  const [timezone, setTimezone] = useState(profile?.timezone || 'Asia/Jakarta')
  const [savingProfile, setSavingProfile] = useState(false)

  // Notification Permission State
  const [pushPermission, setPushPermission] = useState<string>('default')
  const [hasToken, setHasToken] = useState(!!profile?.fcm_token)
  const [registeringPush, setRegisteringPush] = useState(false)
  const router = useRouter()

  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleExportData = async () => {
    setExporting(true)
    try {
      const res = await exportUserData()
      if (res.success && res.data) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(res.data, null, 2)
        )}`
        const downloadAnchor = document.createElement('a')
        downloadAnchor.setAttribute('href', jsonString)
        downloadAnchor.setAttribute('download', `fimo_data_export_${new Date().toISOString().split('T')[0]}.json`)
        document.body.appendChild(downloadAnchor)
        downloadAnchor.click()
        downloadAnchor.remove()
        toast.success('Ekspor data berhasil diunduh.')
      } else {
        toast.error(res.error || 'Gagal mengekspor data.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Terjadi kesalahan saat mengekspor data.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      const res = await deleteUserAccount()
      if (res.success) {
        toast.success('Akun Anda berhasil dihapus.')
        router.push('/auth/login')
      } else {
        toast.error(res.error || 'Gagal menghapus akun.')
      }
    } catch (err) {
      console.error(err)
      toast.error('Terjadi kesalahan saat menghapus akun.')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission)
    }
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName) {
      toast.error('Nama lengkap wajib diisi!')
      return
    }

    setSavingProfile(true)
    const res = await updateProfile({
      full_name: fullName,
      currency,
      timezone
    })

    if (res.success) {
      toast.success('Pengaturan profil berhasil disimpan!')
      router.refresh()
    } else {
      toast.error(res.error || 'Gagal menyimpan profil.')
    }
    setSavingProfile(false)
  }

  const handleRequestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Browser Anda tidak mendukung notifikasi push.')
      return
    }

    setRegisteringPush(true)
    try {
      const permission = await Notification.requestPermission()
      setPushPermission(permission)

      if (permission === 'granted') {
        // Mendapatkan token FCM nyata dari SDK Firebase
        const token = await getFirebaseToken()
        
        if (!token) {
          throw new Error('Gagal mendapatkan token FCM. Pastikan konfigurasi Firebase dan VAPID Key Anda sudah benar.')
        }
        
        // Save token to database
        const res = await updateFcmToken(token)
        if (res.success) {
          setHasToken(true)
          toast.success('Notifikasi push berhasil diaktifkan!')
          router.refresh()
        } else {
          toast.error(res.error || 'Gagal menyimpan token notifikasi.')
        }
      } else if (permission === 'denied') {
        toast.warning('Izin notifikasi ditolak. Anda tidak akan menerima notifikasi push.')
      }
    } catch (error) {
      console.error('Error requesting push permission:', error)
      const msg = error instanceof Error ? error.message : 'Gagal meminta izin notifikasi.'
      toast.error(msg)
    } finally {
      setRegisteringPush(false)
    }
  }

  const handleDisablePush = async () => {
    setRegisteringPush(true)
    const res = await updateFcmToken(null)
    if (res.success) {
      setHasToken(false)
      toast.success('Notifikasi push dinonaktifkan.')
      router.refresh()
    } else {
      toast.error(res.error || 'Gagal memperbarui pengaturan.')
    }
    setRegisteringPush(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
          <span className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-xl">⚙️</span>
          Pengaturan
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Sesuaikan profil, mata uang default, zona waktu, dan preferensi notifikasi Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Card */}
        <Card className="border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-card/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-neutral-500" />
              Profil & Preferensi
            </CardTitle>
            <CardDescription className="text-xs">
              Ubah informasi dasar akun Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nama Lengkap</Label>
                <Input 
                  id="full_name" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="rounded-xl border-neutral-200 dark:border-neutral-800"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency" className="flex items-center gap-1">
                    <Wallet className="h-3.5 w-3.5 text-neutral-400" />
                    Mata Uang Default
                  </Label>
                  <select
                    id="currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                  >
                    <option value="IDR">Rupiah Indonesia (IDR)</option>
                    <option value="USD">Dolar AS (USD)</option>
                    <option value="SGD">Dolar Singapura (SGD)</option>
                    <option value="EUR">Euro (EUR)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timezone" className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-neutral-400" />
                    Zona Waktu
                  </Label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                  >
                    <option value="Asia/Jakarta">Jakarta (WIB - UTC+7)</option>
                    <option value="Asia/Makassar">Makassar (WITA - UTC+8)</option>
                    <option value="Asia/Jayapura">Jayapura (WIT - UTC+9)</option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button 
                  type="submit" 
                  disabled={savingProfile}
                  className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-xl px-5"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : 'Simpan Profil'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Push Notifications Card */}
        <Card className="border-neutral-200 dark:border-neutral-800 rounded-xl bg-white dark:bg-card/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-neutral-500" />
              Notifikasi Push Browser
            </CardTitle>
            <CardDescription className="text-xs">
              Terima notifikasi tagihan jatuh tempo dan peringatan anggaran secara instan di browser Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status indicator */}
            <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800/80">
              <div className={cn(
                "p-2 rounded-full",
                pushPermission === 'granted' && hasToken
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
              )}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
                  {pushPermission === 'granted' && hasToken ? 'Notifikasi Push Aktif' : 'Notifikasi Push Nonaktif'}
                </h4>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                  {pushPermission === 'granted' && hasToken 
                    ? 'Browser ini terdaftar untuk menerima pembaruan keuangan fimo.' 
                    : pushPermission === 'denied'
                    ? 'Izin notifikasi diblokir di browser. Mohon reset perizinan pada info situs.'
                    : 'Aktifkan notifikasi untuk menerima pengingat multi-channel secara real-time.'
                  }
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {pushPermission === 'granted' && hasToken ? (
                <Button 
                  onClick={handleDisablePush} 
                  variant="destructive"
                  disabled={registeringPush}
                  className="rounded-xl px-5 border-none"
                >
                  {registeringPush ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Nonaktifkan Notifikasi Push
                </Button>
              ) : (
                <Button 
                  onClick={handleRequestPushPermission} 
                  disabled={registeringPush || pushPermission === 'denied'}
                  className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-xl px-5"
                >
                  {registeringPush ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Smartphone className="h-4 w-4 mr-2" />
                      Aktifkan Notifikasi Push
                    </>
                  )}
                </Button>
              )}

              {pushPermission === 'denied' && (
                <div className="flex items-center gap-1.5 text-xs text-rose-500 mt-1">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Izin ditolak. Silakan ubah izin situs di pengaturan URL gembok browser Anda.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* GDPR Privacy & Actions Card */}
        <Card className="border-rose-100 dark:border-rose-950/30 rounded-xl bg-white dark:bg-card/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
              Keamanan & Privasi (GDPR)
            </CardTitle>
            <CardDescription className="text-xs">
              Ekspor salinan data Anda atau hapus akun Anda secara permanen beserta seluruh catatan keuangan Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Export Button */}
              <Button
                onClick={handleExportData}
                disabled={exporting}
                variant="outline"
                type="button"
                className="flex-1 rounded-xl border-neutral-200 dark:border-neutral-800 gap-2 text-xs font-semibold min-h-[48px] px-4 py-3"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Ekspor Semua Data (JSON)
              </Button>

              {/* Delete Account Alert Dialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    type="button"
                    disabled={deleting}
                    className="flex-1 rounded-xl gap-2 text-xs font-semibold border-none min-h-[48px] px-4 py-3"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Hapus Seluruh Akun & Data
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5" />
                      Apakah Anda yakin ingin menghapus akun?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm space-y-2">
                      <p>
                        Tindakan ini <strong>permanen</strong> dan tidak dapat dibatalkan.
                      </p>
                      <p>
                        Seluruh profil, daftar dompet, kategori custom, catatan transaksi, anggaran bulanan, rencana berulang, pengingat, dan notifikasi Anda akan <strong>dihapus selamanya</strong> dari server kami.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      className="bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      Ya, Hapus Permanen
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
