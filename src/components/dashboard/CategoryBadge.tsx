import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'

interface CategoryBadgeProps {
  name: string
  iconName?: string
  color?: string
  className?: string
}

export function CategoryBadge({ name, iconName, color, className }: CategoryBadgeProps) {
  // Dynamic icon loading from Lucide
  const Icon = (LucideIcons as any)[iconName || 'Tag'] || LucideIcons.Tag

  return (
    <div 
      className={cn(
        "inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all",
        className
      )}
      style={{ 
        backgroundColor: `${color}15`, // 15% opacity
        color: color || '#64748b',
        borderColor: `${color}30` // 30% opacity
      }}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{name}</span>
    </div>
  )
}
