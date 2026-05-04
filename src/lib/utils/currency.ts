/**
 * Format number to IDR currency string
 * @param amount Number to format
 * @param compact Whether to use compact notation (e.g., 1,5 jt)
 * @returns Formatted string
 */
export function formatIDR(amount: number, compact: boolean = false): string {
  if (compact) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount)
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format number to any currency string
 * @param amount Number to format
 * @param currency Currency code (USD, EUR, etc.)
 * @returns Formatted string
 */
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}
