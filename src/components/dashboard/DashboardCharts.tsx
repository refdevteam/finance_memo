'use client'

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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

export const COLORS = [
  '#c5b0f4', // block-lilac
  '#dceeb1', // block-lime
  '#c8e6cd', // block-mint
  '#efd4d4', // block-pink
  '#f3c9b6', // block-coral
  '#f4ecd6', // block-cream
]

const COLOR_MAPPING: Record<string, string> = {
  '#f43f5e': '#efd4d4', // pink
  '#ef4444': '#efd4d4',
  '#e11d48': '#efd4d4',
  '#8b5cf6': '#c5b0f4', // lilac
  '#6366f1': '#c5b0f4',
  '#7c3aed': '#c5b0f4',
  '#3b82f6': '#c5b0f4', // lilac/blue
  '#2563eb': '#c5b0f4',
  '#06b6d4': '#c8e6cd', // mint
  '#10b981': '#c8e6cd', // mint
  '#14b8a6': '#c8e6cd',
  '#16a34a': '#c8e6cd',
  '#f59e0b': '#f4ecd6', // cream
  '#d97706': '#f4ecd6',
  '#f97316': '#f3c9b6', // coral
}

export function getPastelColor(color: string | null | undefined, index: number): string {
  if (!color) return COLORS[index % COLORS.length]
  const normalized = color.toLowerCase()
  if (COLOR_MAPPING[normalized]) return COLOR_MAPPING[normalized]
  const pastelSet = new Set(COLORS)
  if (pastelSet.has(normalized)) return normalized
  return COLORS[index % COLORS.length]
}

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover/90 dark:bg-popover/90 backdrop-blur-lg shadow-lg p-3 text-xs text-popover-foreground">
      <p className="font-medium text-muted-foreground mb-1.5">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, idx: number) => {
        const entryColor = entry.color || entry.fill || entry.payload?.color || entry.payload?.payload?.color;
        return (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entryColor }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              {formatRupiah(entry.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export function SpendingTrendChart({ data, height = 300 }: { data: DailyData[]; height?: number }) {
  if (!data.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center border-2 border-dashed border-border rounded-xl">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Belum ada data transaksi bulan ini.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Mulai catat transaksi untuk melihat tren.</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
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

export function CategoryBarChart({ data, height = 260 }: { data: CategoryData[]; height?: number }) {
  if (!data.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center border-2 border-dashed border-border rounded-xl">
        <div className="text-center p-2">
          <p className="text-muted-foreground text-xs sm:text-sm">Belum ada pengeluaran bulan ini.</p>
        </div>
      </div>
    )
  }

  // Sort descending by value to show highest expenses first
  const sortedData = [...data].sort((a, b) => b.value - a.value)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sortedData}
        margin={{ top: 10, right: 5, left: -20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
        <XAxis 
          dataKey="name"
          tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
        <Bar dataKey="value" name="Pengeluaran" radius={[4, 4, 0, 0]} barSize={18}>
          {sortedData.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={getPastelColor(entry.color, idx)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CategoryMiniPieChart({ data }: { data: CategoryData[] }) {
  if (!data.length) return null
  const chartData = data.slice(0, 4)
  return (
    <div className="w-[42px] h-[42px] relative shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPie>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={11}
            outerRadius={20}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={getPastelColor(entry.color, idx)} />
            ))}
          </Pie>
        </RechartsPie>
      </ResponsiveContainer>
    </div>
  )
}

export function SixMonthTrendChart({ data, height = 300 }: { data: DailyData[]; height?: number }) {
  if (!data.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center border-2 border-dashed border-border rounded-xl">
        <div className="text-center p-2">
          <p className="text-muted-foreground text-xs sm:text-sm">Belum ada data transaksi.</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: height > 180 ? -15 : -12, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
        <XAxis 
          dataKey="date" 
          tick={{ fontSize: height > 180 ? 11 : 9, fill: '#94a3b8' }} 
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tick={{ fontSize: height > 180 ? 11 : 9, fill: '#94a3b8' }} 
          tickFormatter={formatCompact}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Legend wrapperStyle={{ fontSize: height > 180 ? '12px' : '10px', paddingTop: '4px' }} />
        <Bar dataKey="income" name="Pemasukan" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={height > 180 ? 20 : 12} />
        <Bar dataKey="expense" name="Pengeluaran" fill="#f43f5e" radius={[2, 2, 0, 0]} barSize={height > 180 ? 20 : 12} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function SpendingMiniTrendChart({ data }: { data: DailyData[] }) {
  if (!data.length) return null
  return (
    <div className="w-[52px] h-[32px] relative shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Area
            type="monotone"
            dataKey="income"
            stroke="#3b82f6"
            strokeWidth={1.5}
            fill="transparent"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#f43f5e"
            strokeWidth={1.5}
            fill="transparent"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
