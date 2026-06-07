'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  PieChart, 
  Settings, 
  LogOut,
  TrendingUp,
  Menu,
  Sun,
  Moon,
  Plus,
  PiggyBank
} from 'lucide-react'
import { signOut } from '@/actions/auth'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { TransferForm } from '@/components/transactions/TransferForm'
import { ReceiptScanner } from '@/components/transactions/ReceiptScanner'
import { NotificationCenter } from '@/components/layout/NotificationCenter'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Wallet, label: 'Dompet', href: '/dashboard/wallets' },
  { icon: ArrowLeftRight, label: 'Transaksi', href: '/dashboard/transactions' },
  { icon: PiggyBank, label: 'Anggaran', href: '/dashboard/budgets' },
  { icon: PieChart, label: 'Kategori', href: '/dashboard/categories' },
  { icon: TrendingUp, label: 'Laporan', href: '/dashboard/reports' },
]

const secondaryItems = [
  { icon: Settings, label: 'Pengaturan', href: '/dashboard/settings' },
]

function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  const isDark = theme === 'dark' || resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      className={cn(
        "rounded-full w-9 h-9 transition-all z-50",
        isDark
          ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:bg-amber-500/20"
          : "hover:bg-neutral-100 text-neutral-600 border border-transparent"
      )}
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark');
      }}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-amber-400 fill-amber-400/20" />
      ) : (
        <Moon className="h-5 w-5 text-neutral-600" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

function SidebarContent({ pathname }: { pathname: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-circle.png"
            className="w-8 h-8 object-contain rounded-full border border-neutral-200/30 dark:border-neutral-800/30 transition-transform duration-300 group-hover:rotate-12"
            alt="Fimo Logo"
          />
          <span className="text-xl font-bold tracking-tight dark:text-white group-hover:text-indigo-500 transition-colors">fimo</span>
        </Link>
        <div className="hidden md:flex items-center space-x-1">
          <NotificationCenter />
          <ThemeToggle />
        </div>
      </div>

      <div className="px-4 mb-4 flex flex-col gap-2">
        <TransactionForm />
        <TransferForm />
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive 
                  ? "text-black dark:text-white font-semibold" 
                  : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-pill"
                  className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg -z-10 shadow-xs"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <item.icon className={cn("h-5 w-5 transition-colors", isActive ? "text-indigo-600 dark:text-indigo-400" : "")} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-6 border-t border-border space-y-1">
        {secondaryItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900"
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function Sidebar({ wallets = [], categories = [] }: { wallets?: any[], categories?: any[] }) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Top Header - iOS Style Glass */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-border dark:border-slate-900 bg-white/70 dark:bg-slate-950/85 backdrop-blur-xl z-40 flex items-center px-4 justify-between">
        <Link href="/dashboard" className="flex items-center space-x-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-circle.png"
            className="w-7 h-7 object-contain rounded-full border border-neutral-200/30 dark:border-neutral-800/30"
            alt="Fimo Logo"
          />
          <span className="font-bold tracking-tight text-neutral-900 dark:text-white text-base">fimo</span>
        </Link>
        
        <div className="flex items-center space-x-1">
          <NotificationCenter />
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile Floating Bottom Bar - iOS Glassmorphism */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[400px] h-16 rounded-full border border-border bg-white/70 dark:bg-card/70 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-40 flex items-center justify-around px-2">
        {/* Beranda */}
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-200 relative",
            pathname === "/dashboard"
              ? "text-black dark:text-white"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] font-semibold mt-0.5">Beranda</span>
          {pathname === "/dashboard" && (
            <span className="absolute bottom-1 w-1 h-1 bg-black dark:bg-white rounded-full" />
          )}
        </Link>

        {/* Dompet */}
        <Link
          href="/dashboard/wallets"
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-200 relative",
            pathname === "/dashboard/wallets"
              ? "text-black dark:text-white"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          )}
        >
          <Wallet className="h-5 w-5" />
          <span className="text-[10px] font-semibold mt-0.5">Dompet</span>
          {pathname === "/dashboard/wallets" && (
            <span className="absolute bottom-1 w-1 h-1 bg-black dark:bg-white rounded-full" />
          )}
        </Link>

        {/* Floating Add (+) Action Sheet */}
        <Sheet>
          <SheetTrigger render={
            <button className="flex items-center justify-center w-12 h-12 rounded-full bg-black dark:bg-white text-white dark:text-black shadow-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all duration-200 active:scale-95 -translate-y-4 border-4 border-background dark:border-background">
              <Plus className="h-6 w-6 font-bold" />
            </button>
          } />
          <SheetContent side="bottom" className="rounded-t-3xl p-6 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-2xl border-t border-border max-h-[85vh] overflow-y-auto">
            <SheetHeader className="text-center pb-4">
              <SheetTitle className="text-lg font-bold">Catat Keuangan Baru</SheetTitle>
              <SheetDescription className="text-xs text-neutral-500 dark:text-neutral-400">
                Pilih transaksi baru atau transfer antar dompet Anda.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-3 py-4">
              <ReceiptScanner wallets={wallets} categories={categories} />
              <TransactionForm />
              <TransferForm />
            </div>
          </SheetContent>
        </Sheet>

        {/* Transaksi */}
        <Link
          href="/dashboard/transactions"
          className={cn(
            "flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-200 relative",
            pathname === "/dashboard/transactions"
              ? "text-black dark:text-white"
              : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          )}
        >
          <ArrowLeftRight className="h-5 w-5" />
          <span className="text-[10px] font-semibold mt-0.5">Transaksi</span>
          {pathname === "/dashboard/transactions" && (
            <span className="absolute bottom-1 w-1 h-1 bg-black dark:bg-white rounded-full" />
          )}
        </Link>

        {/* More Menu Sheet */}
        <Sheet>
          <SheetTrigger render={
            <button className="flex flex-col items-center justify-center w-12 h-12 rounded-full transition-all duration-200 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
              <Menu className="h-5 w-5" />
              <span className="text-[10px] font-semibold mt-0.5">Menu</span>
            </button>
          } />
          <SheetContent side="bottom" className="rounded-t-3xl p-6 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-2xl border-t border-border">
            <SheetHeader className="text-left pb-4">
              <SheetTitle className="text-lg font-bold">Fimo Menu</SheetTitle>
            </SheetHeader>
            <div className="space-y-1 py-2">
              <Link
                href="/dashboard/categories"
                className={cn(
                  "flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                  pathname === "/dashboard/categories"
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                    : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900"
                )}
              >
                <PieChart className="h-5 w-5" />
                <span>Kategori</span>
              </Link>
              <Link
                href="/dashboard/reports"
                className={cn(
                  "flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                  pathname === "/dashboard/reports"
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                    : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900"
                )}
              >
                <TrendingUp className="h-5 w-5" />
                <span>Laporan</span>
              </Link>
              <Link
                href="/dashboard/budgets"
                className={cn(
                  "flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                  pathname === "/dashboard/budgets"
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                    : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900"
                )}
              >
                <PiggyBank className="h-5 w-5" />
                <span>Anggaran</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className={cn(
                  "flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
                  pathname === "/dashboard/settings"
                    ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                    : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900"
                )}
              >
                <Settings className="h-5 w-5" />
                <span>Pengaturan</span>
              </Link>
              
              <div className="h-px bg-border my-2" />
              
              <button
                onClick={() => signOut()}
                className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 transition-all"
              >
                <LogOut className="h-5 w-5" />
                <span>Keluar</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-white dark:bg-background flex-col h-screen sticky top-0">
        <SidebarContent pathname={pathname} />
      </aside>
    </>
  )
}
