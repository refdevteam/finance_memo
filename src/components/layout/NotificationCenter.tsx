'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Info, 
  Sparkles, 
  Check, 
  X 
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent 
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '@/actions/notifications'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  user_id: string
  title: string
  body: string
  type: 'reminder' | 'budget_alert' | 'recurring' | 'system' | 'ai_insight'
  is_read: boolean
  action_url: string | null
  created_at: string
}

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} m lalu`
    if (diffHours < 24) return `${diffHours} j lalu`
    if (diffDays === 1) return 'Kemarin'
    if (diffDays < 7) return `${diffDays} hari lalu`
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    })
  } catch {
    return 'Beberapa saat lalu'
  }
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'reminder':
      return <Clock className="h-4 w-4 text-amber-500" />
    case 'budget_alert':
      return <AlertTriangle className="h-4 w-4 text-rose-500" />
    case 'recurring':
      return <RefreshCw className="h-4 w-4 text-emerald-500 animate-spin-slow" />
    case 'ai_insight':
      return <Sparkles className="h-4 w-4 text-violet-500" />
    default:
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  // Derive unread count dynamically from state
  const unreadCount = notifications.filter(n => !n.is_read).length

  // Fetch initial notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await getNotifications()
        setNotifications(data as Notification[])
      } catch (err) {
        console.error('Failed to load notifications:', err)
      }
    }

    loadNotifications()
  }, [])

  // Subscribe to real-time notifications
  useEffect(() => {
    const channelName = 'realtime-notifications-' + Math.random().toString(36).substring(7)
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as Notification
            setNotifications(prev => [newNotif, ...prev].slice(0, 20))
            
            // Show toast
            toast(newNotif.title, {
              description: newNotif.body,
              action: newNotif.action_url ? {
                label: 'Lihat',
                onClick: () => router.push(newNotif.action_url || '')
              } : undefined,
              icon: getNotificationIcon(newNotif.type)
            })
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as Notification
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setNotifications(prev => prev.filter(n => n.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  // Mark single as read
  async function handleMarkAsRead(id: string, actionUrl: string | null) {
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )

    await markNotificationAsRead(id)

    if (actionUrl) {
      setOpen(false)
      router.push(actionUrl)
    }
  }

  // Mark all as read
  async function handleMarkAllAsRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    await markAllNotificationsAsRead()
    toast.success('Semua notifikasi ditandai terbaca')
  }

  // Delete notification
  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setNotifications(prev => prev.filter(n => n.id !== id))
    await deleteNotification(id)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full w-9 h-9 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-all text-neutral-600 dark:text-neutral-300"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
          <span className="sr-only">Notifikasi</span>
        </Button>
      } />

      <DropdownMenuContent 
        align="end" 
        className="w-80 md:w-96 p-0 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50/50 dark:bg-neutral-900/50 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="font-bold text-neutral-950 dark:text-white text-base py-0 px-0">
            Notifikasi
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              Tandai terbaca
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-neutral-400 dark:text-neutral-500">
              <Bell className="h-10 w-10 stroke-[1.2] mb-2 text-neutral-300 dark:text-neutral-700" />
              <p className="text-xs">Tidak ada notifikasi baru</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleMarkAsRead(notif.id, notif.action_url)}
                className={cn(
                  "group relative flex items-start gap-3 p-4 transition-all duration-200 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/40",
                  !notif.is_read && "bg-neutral-50/30 dark:bg-neutral-900/10"
                )}
              >
                {/* Icon wrapper */}
                <div className="mt-0.5 rounded-full p-2 bg-neutral-100 dark:bg-neutral-800/80 flex items-center justify-center shrink-0">
                  {getNotificationIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-baseline justify-between mb-0.5">
                    <h4 className={cn(
                      "text-xs truncate",
                      notif.is_read 
                        ? "font-medium text-neutral-700 dark:text-neutral-300" 
                        : "font-bold text-neutral-900 dark:text-white"
                    )}>
                      {notif.title}
                    </h4>
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500 shrink-0 ml-2">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                    {notif.body}
                  </p>
                </div>

                {/* Status Dot — pojok kanan atas, jauh dari teks */}
                {!notif.is_read && (
                  <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-500 group-hover:opacity-0 transition-opacity duration-200 shrink-0" />
                )}

                {/* Delete Button — muncul saat hover, di tengah vertikal */}
                <button
                  onClick={(e) => handleDelete(e, notif.id)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
                  title="Hapus"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
