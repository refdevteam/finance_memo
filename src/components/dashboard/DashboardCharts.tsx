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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-popover/90 dark:bg-popover/90 backdrop-blur-lg shadow-lg p-3 text-xs text-popover-foreground">
      <p className="font-medium text-muted-foreground mb-1.5">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">
            {formatRupiah(entry.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

// Custom legend renderer for pie chart
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomLegend({ payload }: any) {
  if (!payload?.length) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center mt-2">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, idx: number) => {
        const val = entry.payload?.value
        const valStr = typeof val === 'number' ? ` (${formatRupiah(val)})` : ''
        return (
          <div key={idx} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground truncate max-w-[150px]">
              {entry.value}{valStr}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// Custom tooltip for pie chart
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const data = payload[0]
  return (
    <div className="rounded-xl border border-border bg-popover/90 dark:bg-popover/90 backdrop-blur-lg shadow-lg p-3 text-xs text-popover-foreground">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: data.payload.color }}
        />
        <span className="font-medium text-muted-foreground">{data.name}</span>
      </div>
      <p className="font-bold text-foreground mt-1">
        {formatRupiah(data.value)}
      </p>
    </div>
  )
}

export function SpendingTrendChart({ data }: { data: DailyData[] }) {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center border-2 border-dashed border-border rounded-xl">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">Belum ada data transaksi bulan ini.</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Mulai catat transaksi untuk melihat tren.</p>
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

export function CategoryPieChart({ data, height = 260 }: { data: CategoryData[]; height?: number }) {
  if (!data.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center border-2 border-dashed border-border rounded-xl">
        <div className="text-center p-2">
          <p className="text-muted-foreground text-xs sm:text-sm">Belum ada pengeluaran bulan ini.</p>
        </div>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPie>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={height > 180 ? 55 : 22}
          outerRadius={height > 180 ? 85 : 42}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color || COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<PieTooltip />} />
        {height > 180 && <Legend content={<CustomLegend />} />}
      </RechartsPie>
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
              <Cell key={idx} fill={entry.color || COLORS[idx % COLORS.length]} />
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
      <BarChart data={data} margin={{ top: 5, right: 5, left: height > 180 ? -15 : -25, bottom: 0 }}>
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
        {height > 180 && <Legend wrapperStyle={{ fontSize: '12px' }} />}
        <Bar dataKey="income" name="Pemasukan" fill="#3b82f6" radius={[2, 2, 0, 0]} barSize={height > 180 ? 20 : 8} />
        <Bar dataKey="expense" name="Pengeluaran" fill="#f43f5e" radius={[2, 2, 0, 0]} barSize={height > 180 ? 20 : 8} />
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
