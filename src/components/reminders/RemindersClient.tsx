'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Bell, 
  Mail, 
  Smartphone, 
  Calendar, 
  Search, 
  SlidersHorizontal,
  Clock, 
  FileText,
  DollarSign,
  Info
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  createReminder, 
  updateReminder, 
  deleteReminder, 
  toggleReminderStatus 
} from '@/actions/reminders'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Reminder {
  id: string
  title: string
  type: 'saving' | 'installment' | 'subscription' | 'bill' | 'custom'
  amount: number | null
  due_date: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  next_remind: string | null
  is_active: boolean
  channels: {
    push: boolean
    email: boolean
    inapp: boolean
  }
  notes: string | null
}

interface RemindersClientProps {
  initialReminders: any[]
}

function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return 'Tanpa nominal'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDateIndo(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  } catch (e) {
    return dateStr
  }
}

const typeConfig = {
  saving: { label: 'Tabungan', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400', icon: '💰' },
  installment: { label: 'Cicilan', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400', icon: '💳' },
  subscription: { label: 'Langganan', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400', icon: '🍿' },
  bill: { label: 'Tagihan', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400', icon: '📄' },
  custom: { label: 'Kustom', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400', icon: '🔔' },
}

const frequencyLabels = {
  daily: 'Harian',
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  yearly: 'Tahunan',
}

export function RemindersClient({ initialReminders }: RemindersClientProps) {
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders as Reminder[])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const router = useRouter()

  // Form State
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [type, setType] = useState<Reminder['type']>('custom')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [frequency, setFrequency] = useState<string>('none')
  const [channels, setChannels] = useState({ push: true, email: false, inapp: true })
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Confirm delete dialog
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Handlers
  const openCreateDialog = () => {
    setIsEditing(false)
    setEditingId(null)
    setTitle('')
    setType('custom')
    setAmount('')
    setDueDate(new Date().toISOString().split('T')[0])
    setFrequency('none')
    setChannels({ push: true, email: false, inapp: true })
    setNotes('')
    setDialogOpen(true)
  }

  const openEditDialog = (reminder: Reminder) => {
    setIsEditing(true)
    setEditingId(reminder.id)
    setTitle(reminder.title)
    setType(reminder.type)
    setAmount(reminder.amount ? reminder.amount.toString() : '')
    setDueDate(reminder.due_date)
    setFrequency(reminder.frequency || 'none')
    setChannels(reminder.channels || { push: true, email: false, inapp: true })
    setNotes(reminder.notes || '')
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !dueDate) {
      toast.error('Judul dan tanggal wajib diisi!')
      return
    }

    setLoading(true)

    const payload = {
      title,
      type,
      amount: amount ? Number(amount) : null,
      due_date: dueDate,
      frequency: frequency === 'none' ? null : (frequency as Reminder['frequency']),
      channels,
      notes: notes || null
    }

    let res
    if (isEditing && editingId) {
      res = await updateReminder(editingId, payload)
    } else {
      res = await createReminder(payload)
    }

    if (res.success) {
      toast.success(isEditing ? 'Pengingat diperbarui!' : 'Pengingat baru berhasil dibuat!')
      setDialogOpen(false)
      // Refresh state from server
      router.refresh()
      // Temporarily update local state for faster responsiveness
      setTimeout(async () => {
        const fetchNew = await import('@/actions/reminders')
        const data = await fetchNew.getReminders()
        setReminders(data as Reminder[])
      }, 300)
    } else {
      toast.error(res.error || 'Terjadi kesalahan.')
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    const res = await deleteReminder(deleteId)
    if (res.success) {
      toast.success('Pengingat berhasil dihapus')
      setReminders(prev => prev.filter(r => r.id !== deleteId))
      setDeleteId(null)
      router.refresh()
    } else {
      toast.error(res.error || 'Gagal menghapus pengingat')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    // Optimistic update
    setReminders(prev => 
      prev.map(r => r.id === id ? { ...r, is_active: nextStatus } : r)
    )

    const res = await toggleReminderStatus(id, nextStatus)
    if (res.success) {
      toast.success(nextStatus ? 'Pengingat diaktifkan kembali' : 'Pengingat dinonaktifkan')
      router.refresh()
      // Reload from source to ensure next_remind updates accurately
      setTimeout(async () => {
        const fetchNew = await import('@/actions/reminders')
        const data = await fetchNew.getReminders()
        setReminders(data as Reminder[])
      }, 300)
    } else {
      toast.error(res.error || 'Gagal mengubah status pengingat')
      // Revert optimistic
      setReminders(prev => 
        prev.map(r => r.id === id ? { ...r, is_active: currentStatus } : r)
      )
    }
  }

  // Filtering
  const filteredReminders = reminders.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || 
      (r.notes && r.notes.toLowerCase().includes(search.toLowerCase()))
    const matchesType = filterType === 'all' || r.type === filterType
    return matchesSearch && matchesType
  })

  const activeReminders = filteredReminders.filter(r => r.is_active)
  const inactiveReminders = filteredReminders.filter(r => !r.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <span className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-xl">🔔</span>
            Pengingat Tagihan & Tabungan
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Kelola pengingat otomatis multi-channel untuk tagihan, tabungan, cicilan, dan langganan Anda.
          </p>
        </div>
        <Button 
          onClick={openCreateDialog}
          className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-md rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Tambah Pengingat
        </Button>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input 
            placeholder="Cari pengingat..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white dark:bg-card/50 border-neutral-200 dark:border-neutral-800 rounded-xl"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 bg-white dark:bg-card/50 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
            >
              <option value="all">Semua Kategori</option>
              <option value="bill">📄 Tagihan</option>
              <option value="saving">💰 Tabungan</option>
              <option value="installment">💳 Cicilan</option>
              <option value="subscription">🍿 Langganan</option>
              <option value="custom">🔔 Kustom</option>
            </select>
            <SlidersHorizontal className="absolute right-3 top-2.5 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Active Reminders List */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Pengingat Aktif ({activeReminders.length})
        </h2>

        {activeReminders.length === 0 ? (
          <div className="border border-dashed border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-card/20 rounded-2xl p-12 text-center">
            <Clock className="h-10 w-10 text-neutral-300 dark:text-neutral-700 mx-auto stroke-[1.2] mb-3" />
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Tidak ada pengingat aktif</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              Saat ini tidak ada pengingat aktif yang sesuai dengan kriteria filter Anda. Buat baru untuk menjadwalkan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeReminders.map((reminder) => {
              const cfg = typeConfig[reminder.type] || typeConfig.custom
              return (
                <div 
                  key={reminder.id}
                  className="group relative border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-card/45 backdrop-blur-md rounded-2xl p-5 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200"
                >
                  {/* Category, Status and Options */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold", cfg.color)}>
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </span>

                    {/* Status & Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleToggleActive(reminder.id, reminder.is_active)}
                        className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-500 hover:text-amber-500"
                        title="Nonaktifkan"
                      >
                        <Clock className="h-4 w-4 fill-amber-500/10 text-amber-500" />
                      </button>
                      <button 
                        onClick={() => openEditDialog(reminder)}
                        className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(reminder.id)}
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all text-neutral-400 hover:text-rose-600"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Title & Notes */}
                  <h3 className="font-bold text-neutral-900 dark:text-white text-base truncate mb-1" title={reminder.title}>
                    {reminder.title}
                  </h3>
                  
                  {reminder.notes && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-4 h-8">
                      {reminder.notes}
                    </p>
                  )}
                  {!reminder.notes && <div className="h-8 mb-4" />}

                  {/* Amount / Price */}
                  <div className="mb-4">
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                      Jumlah Uang
                    </span>
                    <span className="text-lg font-extrabold text-neutral-900 dark:text-white">
                      {formatRupiah(reminder.amount)}
                    </span>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800/80 my-3" />

                  {/* Due Date, Frequency, and Channels */}
                  <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{formatDateIndo(reminder.due_date)}</span>
                      {reminder.frequency && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0.5 border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
                          {frequencyLabels[reminder.frequency]}
                        </Badge>
                      )}
                    </div>

                    {/* Channels icons */}
                    <div className="flex gap-1.5 items-center">
                      <Bell 
                        className={cn(
                          "h-3.5 w-3.5", 
                          reminder.channels?.inapp ? "text-emerald-500" : "text-neutral-300 dark:text-neutral-700"
                        )} 
                        title="Dalam Aplikasi" 
                      />
                      <Mail 
                        className={cn(
                          "h-3.5 w-3.5", 
                          reminder.channels?.email ? "text-emerald-500" : "text-neutral-300 dark:text-neutral-700"
                        )} 
                        title="Email" 
                      />
                      <Smartphone 
                        className={cn(
                          "h-3.5 w-3.5", 
                          reminder.channels?.push ? "text-emerald-500" : "text-neutral-300 dark:text-neutral-700"
                        )} 
                        title="Push Notification" 
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Inactive Reminders (History) */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Histori Pengingat Nonaktif ({inactiveReminders.length})
        </h2>

        {inactiveReminders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inactiveReminders.map((reminder) => {
              const cfg = typeConfig[reminder.type] || typeConfig.custom
              return (
                <div 
                  key={reminder.id}
                  className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-card/10 rounded-2xl p-5 opacity-65 hover:opacity-100 transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-900/60 dark:text-neutral-400">
                      <span>{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </span>

                    {/* Toggle and Delete */}
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleToggleActive(reminder.id, reminder.is_active)}
                        className="p-1.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-400 hover:text-emerald-600"
                        title="Aktifkan Kembali"
                      >
                        <Clock className="h-4 w-4 text-neutral-400" />
                      </button>
                      <button 
                        onClick={() => setDeleteId(reminder.id)}
                        className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all text-neutral-400 hover:text-rose-600"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-neutral-500 dark:text-neutral-400 text-base truncate mb-1">
                    {reminder.title}
                  </h3>
                  
                  {reminder.notes && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 line-clamp-2 leading-relaxed mb-4 h-8">
                      {reminder.notes}
                    </p>
                  )}
                  {!reminder.notes && <div className="h-8 mb-4" />}

                  <div className="mb-4">
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
                      Jumlah Uang
                    </span>
                    <span className="text-base font-bold text-neutral-500 dark:text-neutral-400">
                      {formatRupiah(reminder.amount)}
                    </span>
                  </div>

                  <div className="h-px bg-neutral-100 dark:bg-neutral-800/80 my-3" />

                  <div className="flex items-center justify-between text-xs text-neutral-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-neutral-400" />
                      <span>{formatDateIndo(reminder.due_date)}</span>
                    </div>
                    <Badge variant="outline" className="text-[9px] px-1 py-0.5 text-neutral-400 border-neutral-200 dark:border-neutral-800">
                      Nonaktif
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CRUD Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-6 bg-white dark:bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {isEditing ? 'Edit Pengingat Keuangan' : 'Buat Pengingat Keuangan'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-5 pt-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Judul Pengingat</Label>
              <Input 
                id="title" 
                placeholder="Bayar BPJS, Tabungan Nikah..." 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-xl border-neutral-200 dark:border-neutral-800"
              />
            </div>

            {/* Type & Amount */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Kategori</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as Reminder['type'])}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                >
                  <option value="bill">📄 Tagihan</option>
                  <option value="saving">💰 Tabungan</option>
                  <option value="installment">💳 Cicilan</option>
                  <option value="subscription">🍿 Langganan</option>
                  <option value="custom">🔔 Kustom</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah (Opsional)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-neutral-400 text-sm font-medium">Rp</span>
                  <Input 
                    id="amount" 
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 rounded-xl border-neutral-200 dark:border-neutral-800"
                  />
                </div>
              </div>
            </div>

            {/* Date & Frequency */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="due_date">Tanggal Jatuh Tempo</Label>
                <Input 
                  id="due_date" 
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                  className="rounded-xl border-neutral-200 dark:border-neutral-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frekuensi Pengulangan</Label>
                <select
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-neutral-400"
                >
                  <option value="none">Sekali Saja</option>
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                  <option value="yearly">Tahunan</option>
                </select>
              </div>
            </div>

            {/* Channels Checklist */}
            <div className="space-y-2.5">
              <Label>Saluran Notifikasi</Label>
              <div className="flex gap-4 p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800/80">
                <label className="flex items-center gap-2 cursor-pointer flex-1 justify-center text-xs">
                  <input 
                    type="checkbox"
                    checked={channels.inapp}
                    onChange={(e) => setChannels(prev => ({ ...prev, inapp: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                    <Bell className="h-3.5 w-3.5 text-neutral-500" />
                    In-App
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer flex-1 justify-center text-xs">
                  <input 
                    type="checkbox"
                    checked={channels.email}
                    onChange={(e) => setChannels(prev => ({ ...prev, email: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                    <Mail className="h-3.5 w-3.5 text-neutral-500" />
                    Email
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer flex-1 justify-center text-xs">
                  <input 
                    type="checkbox"
                    checked={channels.push}
                    onChange={(e) => setChannels(prev => ({ ...prev, push: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <span className="flex items-center gap-1 text-neutral-700 dark:text-neutral-300">
                    <Smartphone className="h-3.5 w-3.5 text-neutral-500" />
                    Push
                  </span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <textarea
                id="notes"
                placeholder="Nomor rekening, tautan pembayaran, atau catatan tambahan..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-neutral-400 placeholder:text-neutral-400 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setDialogOpen(false)}
                className="rounded-xl"
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="bg-black hover:bg-neutral-800 text-white dark:bg-white dark:text-black dark:hover:bg-neutral-200 rounded-xl"
              >
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 bg-white dark:bg-neutral-950">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Info className="h-5 w-5 text-rose-500" />
              Hapus Pengingat ini?
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            Apakah Anda yakin ingin menghapus pengingat ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
          </div>
          <DialogFooter className="gap-2 pt-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setDeleteId(null)}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button 
              type="button" 
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl border-none"
            >
              Hapus Permanen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
