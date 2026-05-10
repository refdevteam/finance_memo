"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface InlineSelectProps {
  options: SelectOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
  name?: string
  disabled?: boolean
  error?: boolean
}

/**
 * A simple, fully-styled inline select component that renders 
 * its dropdown inline (no portals). Designed for use inside Dialogs
 * where Base UI Select's portal conflicts with Dialog focus traps.
 */
const InlineSelect = React.forwardRef<HTMLInputElement, InlineSelectProps>(
  (
    {
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = "Pilih...",
      className,
      id,
      name,
      disabled = false,
      error = false,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState(defaultValue || "")
    const containerRef = React.useRef<HTMLDivElement>(null)

    const currentValue = controlledValue !== undefined ? controlledValue : internalValue
    const selectedOption = options.find((o) => o.value === currentValue)

    // Close dropdown when clicking outside
    React.useEffect(() => {
      if (!isOpen) return
      const handleClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false)
        }
      }
      document.addEventListener("pointerdown", handleClick)
      return () => document.removeEventListener("pointerdown", handleClick)
    }, [isOpen])

    // Close on Escape
    React.useEffect(() => {
      if (!isOpen) return
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setIsOpen(false)
      }
      document.addEventListener("keydown", handleKey)
      return () => document.removeEventListener("keydown", handleKey)
    }, [isOpen])

    const handleSelect = (val: string) => {
      if (controlledValue === undefined) {
        setInternalValue(val)
      }
      onChange?.(val)
      setIsOpen(false)
    }

    return (
      <div ref={containerRef} className="relative">
        {/* Hidden input for form integration */}
        <input
          ref={ref}
          type="hidden"
          id={id}
          name={name}
          value={currentValue}
        />

        {/* Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border border-input bg-transparent py-2.5 pl-3 pr-3 text-sm transition-colors outline-none",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "cursor-pointer h-10 text-left",
            "dark:bg-input/30 dark:hover:bg-input/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-destructive",
            !selectedOption && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground shrink-0 ml-2 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div
            className={cn(
              "absolute left-0 right-0 z-50 mt-1.5",
              "rounded-xl border border-slate-200 dark:border-slate-700/50",
              "bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl",
              "shadow-lg shadow-black/5 dark:shadow-black/20",
              "overflow-hidden",
              "animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
            )}
          >
            <div className="py-1 max-h-48 overflow-y-auto">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt.value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
                    "hover:bg-slate-100 dark:hover:bg-slate-800/60",
                    "disabled:opacity-40 disabled:pointer-events-none",
                    currentValue === opt.value
                      ? "text-emerald-600 dark:text-emerald-400 font-medium"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  <span className="flex-1 text-left truncate">{opt.label}</span>
                  {currentValue === opt.value && (
                    <Check className="size-4 shrink-0 text-emerald-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
)
InlineSelect.displayName = "InlineSelect"

export { InlineSelect }
export type { SelectOption, InlineSelectProps }
