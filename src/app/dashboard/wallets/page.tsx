import { getWallets } from '@/actions/wallets'
import { WalletCard } from '@/components/dashboard/WalletCard'
import { WalletForm } from '@/components/dashboard/WalletForm'
import { Wallet as WalletIcon } from 'lucide-react'

export default async function WalletsPage() {
  const wallets = await getWallets()

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manajemen Dompet</h1>
          <p className="text-slate-500 dark:text-slate-400">
            Kelola semua sumber dana kamu di sini.
          </p>
        </div>
        <WalletForm />
      </div>

      {wallets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-zinc-900 rounded-full">
            <WalletIcon className="h-10 w-10 text-slate-300" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Belum Ada Dompet</h3>
            <p className="text-slate-500 max-w-xs mx-auto">
              Tambahkan dompet pertama kamu (seperti Tunai atau Bank) untuk mulai mencatat transaksi.
            </p>
          </div>
          <WalletForm />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {wallets.map((wallet) => (
            <WalletCard
              key={wallet.id}
              id={wallet.id}
              name={wallet.name}
              type={wallet.type}
              balance={wallet.balance}
              color={wallet.color}
            />
          ))}
        </div>
      )}
    </div>
  )
}
