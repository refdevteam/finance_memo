'use client'

export function PartnerAvatar({
  name,
  src,
  size = 'md',
}: {
  name: string
  src?: string | null
  size?: 'sm' | 'md'
}) {
  const cls =
    size === 'sm'
      ? 'h-7 w-7 text-[11px]'
      : 'h-10 w-10 text-sm'

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`${cls} rounded-full object-cover border border-border shrink-0`}
      />
    )
  }

  const initial = (name || '?').trim().charAt(0).toUpperCase()

  return (
    <div
      className={`${cls} rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center border border-border shrink-0`}
    >
      {initial}
    </div>
  )
}
