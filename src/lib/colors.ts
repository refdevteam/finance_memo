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
