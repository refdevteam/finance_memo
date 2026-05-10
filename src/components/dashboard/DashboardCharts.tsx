'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from 'recharts'

interface DailyData {
  date: string
  income: number
  expense: number
}

interface CategoryData {
  name: string
  value: number
  color: string
}

const COLORS = [
  '#f43f5e', '#8b5cf6', '#3b82f6', '#06b6d4', 
  '#10b981', '#f59e0b', '#ec4899', '#6366f1',
  '#14b8a6', '#f97316',
]

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return value.toString()
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Custom tooltip for area chart
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-slate-600 dark:text-slate-300 mb-1.5">{label}</p>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100">
            {formatRupiah(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Custom legend renderer for pie chart
function CustomLegend({ payload }: any) {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-1.5 text-xs">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-600 dark:text-slate-400 truncate max-w-[100px]">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// Custom tooltip for pie chart
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-xl border border-slate-200/50 dark:border-slate-700/50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg shadow-lg p-3 text-xs">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: data.payload.color }}
        />
        <span className="font-medium text-slate-700 dark:text-slate-200">{data.name}</span>
      </div>
      <p className="font-bold text-slate-800 dark:text-slate-100 mt-1">
        {formatRupiah(data.value)}
      </p>
    </div>
  )
}

export function SpendingTrendChart({ data }: { data: DailyData[] }) {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
        <div className="text-center">
          <p className="text-slate-400 text-sm">Belum ada data transaksi bulan ini.</p>
          <p className="text-slate-300 text-xs mt-1">Mulai catat transaksi untuk melihat tren.</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: 11, fill: '#94a3b8' }} 
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tick={{ fontSize: 11, fill: '#94a3b8' }} 
          tickFormatter={formatCompact}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="income"
          name="Pemasukan"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#incomeGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="Pengeluaran"
          stroke="#f43f5e"
          strokeWidth={2}
          fill="url(#expenseGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (!data.length) {
    return (
      <div className="h-[260px] flex items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
        <div className="text-center">
          <p className="text-slate-400 text-sm">Belum ada pengeluaran bulan ini.</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color || COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        <Legend content={<CustomLegend />} />
      </RechartsPie>
    </ResponsiveContainer>
  )
}
