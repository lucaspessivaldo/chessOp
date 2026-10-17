import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'primary' | 'ink' | 'success' | 'warning' | 'danger'

const buttonTones: Record<Tone, string> = {
  neutral: 'border-border-strong bg-surface-1 text-text-primary hover:border-text-primary',
  primary: 'border-transparent bg-action text-action-foreground hover:bg-action-hover',
  ink: 'border-transparent bg-ink text-ink-foreground hover:opacity-85',
  success: 'border-accent-success/25 bg-accent-success/10 text-accent-success hover:bg-accent-success/15',
  warning: 'border-accent-warning/30 bg-accent-warning/10 text-accent-warning hover:bg-accent-warning/15',
  danger: 'border-accent-danger/25 bg-accent-danger/10 text-accent-danger hover:bg-accent-danger/15',
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
 * Standard button used across the app
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
        'group inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors select-none',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
        size === 'md' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-xs',
        buttonTones[tone],
        className
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      {children && <span className={compactLabel ? 'sr-only sm:not-sr-only' : undefined}>{children}</span>}
      {TrailingIcon && <TrailingIcon className="h-4 w-4 shrink-0" />}
      {shortcut && (
        <kbd className="hidden lg:inline-flex items-center rounded border border-current/20 px-1 font-mono text-[10px] leading-4 opacity-50">
          {shortcut}
        </kbd>
      )}
    </button>
  )
}

const barTones: Record<Exclude<Tone, 'neutral'>, string> = {
  primary: 'bg-ink',
  ink: 'bg-ink',
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
      className={cn('w-full overflow-hidden bg-surface-3', size === 'md' ? 'h-1.5' : 'h-1')}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className={cn('h-full transition-all duration-300', barTones[tone])} style={{ width: `${clamped}%` }} />
    </div>
  )
}

const iconTones: Record<Tone, string> = {
  neutral: 'text-text-muted',
  primary: 'text-action',
  ink: 'text-text-primary',
  success: 'text-accent-success',
  warning: 'text-accent-warning',
  danger: 'text-accent-danger',
}

const edgeTones: Record<Tone, string> = {
  neutral: '',
  primary: 'border-l-2 border-l-action',
  ink: 'border-l-2 border-l-ink',
  success: 'border-l-2 border-l-accent-success',
  warning: 'border-l-2 border-l-accent-warning',
  danger: 'border-l-2 border-l-accent-danger',
}

/**
 * Feedback banner (status, comments, results): quiet surface, the tone shows on the edge and icon
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
      className={cn(
        'flex items-start gap-3 rounded-md border border-border-subtle bg-surface-2/50 px-3.5 py-3 animate-fade-in',
        edgeTones[tone],
        className
      )}
    >
      {Icon && <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconTones[tone])} />}
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-medium text-text-primary">{title}</p>}
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
          {title && <h3 className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function StatTile({ value, label, tone = 'neutral' }: { value: ReactNode; label: string; tone?: Tone }) {
  const color = tone === 'neutral' ? 'text-text-primary' : iconTones[tone]
  return (
    <div className="rounded-md border border-border-subtle px-2 py-2 text-center">
      <p className={cn('text-lg font-semibold tabular-nums leading-tight', color)}>{value}</p>
      <p className="mt-0.5 text-[11px] text-text-muted">{label}</p>
    </div>
  )
}

/**
 * Small indicator showing whose turn it is
 */
export function TurnIndicator({ isUserTurn, userColor }: { isUserTurn: boolean; userColor: 'white' | 'black' }) {
  const sideToMove = isUserTurn ? userColor : userColor === 'white' ? 'black' : 'white'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full border',
          sideToMove === 'white' ? 'border-zinc-400 bg-white' : 'border-zinc-500 bg-zinc-900'
        )}
      />
      {isUserTurn ? 'Your move' : 'Opponent to move'}
    </span>
  )
}

/**
 * King icon showing which side the user plays
 */
export function ColorBadge({ color, className }: { color: 'white' | 'black'; className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border text-base leading-none',
        color === 'white' ? 'border-border-strong bg-white text-zinc-900' : 'border-zinc-700 bg-zinc-900 text-zinc-100',
        className
      )}
      aria-label={`Playing as ${color}`}
      role="img"
    >
      {color === 'white' ? '♔' : '♚'}
    </span>
  )
}

/**
 * On/off switch (green when on)
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-4 py-3 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text-primary">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-text-secondary">{description}</span>}
      </span>
      <span className={cn('relative h-5 w-9 shrink-0 transition-colors', checked ? 'bg-action' : 'bg-surface-3')}>
        <span className={cn('absolute top-0.5 h-4 w-4 bg-surface-1 shadow-sm transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
    </button>
  )
}
