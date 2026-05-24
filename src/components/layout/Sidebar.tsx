'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  PieChart, 
  Settings, 
  LogOut,
  PlusCircle,
  TrendingUp,
  Menu,
  Sun,
  Moon
} from 'lucide-react'
import { signOut } from '@/actions/auth'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransferForm } from '@/components/transactions/TransferForm'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Wallet, label: 'Dompet', href: '/dashboard/wallets' },
  { icon: ArrowLeftRight, label: 'Transaksi', href: '/dashboard/transactions' },
  { icon: PieChart, label: 'Kategori', href: '/dashboard/categories' },
  { icon: TrendingUp, label: 'Laporan', href: '/dashboard/reports' },
]

const secondaryItems = [
  { icon: Settings, label: 'Pengaturan', href: '/dashboard/settings' },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      className="rounded-full w-9 h-9 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-50"
      onClick={() => {
        console.log('Current theme:', theme);
        setTheme(theme === 'dark' ? 'light' : 'dark');
      }}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5 text-amber-400" />
      ) : (
        <Moon className="h-5 w-5 text-slate-600" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">F</span>
          </div>
          <span className="text-xl font-bold tracking-tight dark:text-white">fimo</span>
        </Link>
        <div className="hidden md:block">
          <ThemeToggle />
        </div>
      </div>

      <div className="px-4 mb-4 flex flex-col gap-2">
        <TransactionForm />
        <TransferForm />
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              pathname === item.href 
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" 
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="px-4 py-6 border-t border-slate-100 dark:border-slate-900 space-y-1">
        {secondaryItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
        
        <button
          onClick={() => signOut()}
          className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Sidebar (Hamburger) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl z-40 flex items-center px-4 justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-bold tracking-tight dark:text-white">fimo</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Sheet>
          <SheetTrigger render={
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          } />
          <SheetContent side="left" className="p-0 w-64 border-r-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigasi Fimo</SheetTitle>
            </SheetHeader>
            <SidebarContent pathname={pathname} />
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex-col h-screen sticky top-0">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  )
}
