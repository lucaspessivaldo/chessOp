import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'

const buttonTones: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-text-primary hover:bg-surface-3 border-surface-0',
  primary: 'bg-accent-blue text-white hover:bg-accent-blue-hover border-black/25',
  success: 'bg-accent-success text-white hover:brightness-110 border-black/25',
  warning: 'bg-accent-warning text-zinc-950 hover:brightness-110 border-black/25',
  danger: 'bg-accent-danger text-white hover:brightness-110 border-black/25',
}

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  icon?: LucideIcon
  /** Icon placed after the label */
  trailingIcon?: LucideIcon
  /** Keyboard shortcut shown as a hint on desktop */
  shortcut?: string
  size?: 'sm' | 'md'
  /** Hide the label on very small screens (icon only) */
  compactLabel?: boolean
}

/**
 * Tactile button used across training modes
 */
export function ActionButton({
  tone = 'neutral',
  icon: Icon,
  trailingIcon: TrailingIcon,
  shortcut,
  size = 'md',
  compactLabel = false,
  className,
  children,
  ...props
}: ActionButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'group inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all select-none',
        'border-b-4 active:border-b-0 active:translate-y-1 disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
        size === 'md' ? 'min-h-11 px-4 text-sm' : 'min-h-9 px-3 text-xs',
        buttonTones[tone],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children && <span className={compactLabel ? 'sr-only sm:not-sr-only' : undefined}>{children}</span>}
      {TrailingIcon && <TrailingIcon className="h-4 w-4 shrink-0" />}
      {shortcut && (
        <kbd className="hidden lg:inline-flex items-center rounded border border-current/25 px-1 font-mono text-[10px] leading-4 opacity-60">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

const barTones: Record<Exclude<Tone, 'neutral'>, string> = {
  primary: 'bg-accent-blue',
  success: 'bg-accent-success',
  warning: 'bg-accent-warning',
  danger: 'bg-accent-danger',
}

export function ProgressBar({
  value,
  tone = 'primary',
  size = 'md',
  label,
}: {
  /** 0 – 100 */
  value: number
  tone?: Exclude<Tone, 'neutral'>
  size?: 'sm' | 'md'
  label?: string
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full bg-surface-2', size === 'md' ? 'h-2' : 'h-1.5')}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn('h-full rounded-full transition-all duration-300', barTones[tone])} style={{ width: `${clamped}%` }} />
    </div>
  )
}

const bannerTones: Record<Tone, string> = {
  neutral: 'bg-surface-2/60 border-border-subtle text-text-secondary',
  primary: 'bg-accent-blue/10 border-accent-blue/25 text-accent-blue',
  success: 'bg-accent-success/12 border-accent-success/25 text-accent-success',
  warning: 'bg-accent-warning/10 border-accent-warning/25 text-accent-warning',
  danger: 'bg-accent-danger/12 border-accent-danger/25 text-accent-danger',
}

/**
 * Feedback banner (status, comments, results)
 */
export function StatusBanner({
  tone = 'neutral',
  icon: Icon,
  title,
  children,
  className,
}: {
  tone?: Tone
  icon?: LucideIcon
  title?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 animate-fade-in', bannerTones[tone], className)}
    >
      {Icon && <Icon className="mt-0.5 h-5 w-5 shrink-0" />}
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-semibold">{title}</p>}
        {children && (
          <div className={cn('text-sm leading-relaxed', title ? 'mt-0.5 text-text-secondary' : 'text-text-primary')}>
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Titled block inside a sidebar
 */
export function SidebarSection({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('border-b border-border-subtle p-4 last:border-b-0', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatTile({ value, label, tone = 'neutral' }: { value: ReactNode; label: string; tone?: Tone }) {
  const color = {
    neutral: 'text-text-primary',
    primary: 'text-accent-blue',
    success: 'text-accent-success',
    warning: 'text-accent-warning',
    danger: 'text-accent-danger',
  }[tone]
  return (
    <div className="rounded-lg bg-surface-2/50 px-2 py-2 text-center">
      <p className={cn('text-lg font-bold tabular-nums leading-tight lg:text-xl', color)}>{value}</p>
      <p className="text-[11px] text-text-muted">{label}</p>
    </div>
  )
}

/**
 * Small pill showing whose turn it is
 */
export function TurnIndicator({ isUserTurn, userColor }: { isUserTurn: boolean; userColor: 'white' | 'black' }) {
  const sideToMove = isUserTurn ? userColor : userColor === 'white' ? 'black' : 'white'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full border',
          sideToMove === 'white' ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-900 border-zinc-500',
          isUserTurn && 'ring-2 ring-accent-blue/60'
        )}
      />
      {isUserTurn ? 'Your move' : 'Opponent to move'}
    </span>
  )
}
