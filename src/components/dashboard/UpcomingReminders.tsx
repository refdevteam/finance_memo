'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { completeReminder } from '@/actions/reminders'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Reminder {
  id: string
  title: string
  type: 'saving' | 'installment' | 'subscription' | 'bill' | 'custom'
  amount: number | null
  due_date: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  is_active: boolean
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

function getDueLabel(dueDateStr: string): { label: string; color: string; isOverdue: boolean } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const due = new Date(dueDateStr + 'T00:00:00')
  due.setHours(0, 0, 0, 0)
  
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return { 
      label: `Terlambat ${Math.abs(diffDays)} hari!`, 
      color: 'text-rose-500 dark:text-rose-400 font-bold',
      isOverdue: true 
    }
  }
  if (diffDays === 0) {
    return { 
      label: 'Hari ini', 
      color: 'text-amber-600 dark:text-amber-400 font-bold animate-pulse',
      isOverdue: false 
    }
  }
  if (diffDays === 1) {
    return { 
      label: 'Besok', 
      color: 'text-amber-500 dark:text-amber-400 font-medium',
      isOverdue: false 
    }
  }
  return { 
    label: `${diffDays} hari lagi`, 
    color: 'text-neutral-500 dark:text-neutral-400',
    isOverdue: false 
  }
}

const typeIcons = {
  saving: '💰',
  installment: '💳',
  subscription: '🍿',
  bill: '📄',
  custom: '🔔',
}

export function UpcomingReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadUpcomingReminders() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const sevenDaysLater = new Date()
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
        const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0]

        // Fetch active reminders due up to 7 days from now (including overdue)
        const { data, error } = await supabase
          .from('reminders')
          .select('id, title, type, amount, due_date, frequency, is_active')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .lte('due_date', sevenDaysLaterStr)
          .order('due_date', { ascending: true })

        if (error) throw error
        setReminders(data as Reminder[] || [])
      } catch (err) {
        console.error('Failed to load upcoming reminders:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUpcomingReminders()
  }, [supabase])

  async function handleComplete(id: string, title: string) {
    // Optimistic removal
    setReminders(prev => prev.filter(r => r.id !== id))
    
    const res = await completeReminder(id)
    if (res.success) {
      toast.success(`"${title}" berhasil diselesaikan!`)
    } else {
      toast.error(res.error || 'Gagal menyelesaikan pengingat.')
      // Reload from DB to restore
      const sevenDaysLater = new Date()
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)
      const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0]
      const { data } = await supabase
        .from('reminders')
        .select('*')
        .eq('is_active', true)
        .lte('due_date', sevenDaysLaterStr)
        .order('due_date', { ascending: true })
      if (data) setReminders(data as Reminder[])
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-800 rounded-sm animate-pulse" />
        <div className="h-16 bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse" />
        <div className="h-16 bg-neutral-100 dark:bg-neutral-900 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Pengingat Mendatang
        </h3>
        <Link 
          href="/dashboard/reminders" 
          className="text-xs text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white flex items-center gap-0.5 hover:underline font-medium"
        >
          Lihat semua
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {reminders.length === 0 ? (
        <div className="bg-neutral-50/50 dark:bg-neutral-900/10 border border-neutral-100 dark:border-neutral-800/80 rounded-xl p-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-500/80 mx-auto mb-2" />
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Semua tagihan aman untuk 7 hari ke depan!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((reminder) => {
            const dueInfo = getDueLabel(reminder.due_date)
            return (
              <div 
                key={reminder.id}
                className={cn(
                  "flex items-center justify-between p-3.5 rounded-xl border transition-all duration-200 bg-white dark:bg-card/50",
                  dueInfo.isOverdue 
                    ? "border-rose-200 dark:border-rose-950/40 bg-rose-50/20 dark:bg-rose-950/5" 
                    : "border-neutral-100 dark:border-neutral-900/60"
                )}
              >
                {/* Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="text-lg mt-0.5 shrink-0 select-none">
                    {typeIcons[reminder.type] || '🔔'}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate" title={reminder.title}>
                      {reminder.title}
                    </h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold mt-0.5">
                      {formatRupiah(reminder.amount)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", dueInfo.color)}>
                        {dueInfo.isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                        {dueInfo.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={() => handleComplete(reminder.id, reminder.title)}
                  className="ml-2 shrink-0 p-2 rounded-xl text-neutral-400 hover:text-emerald-600 hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all"
                  title="Tandai Selesai"
                >
                  <CheckCircle2 className="h-5 w-5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
