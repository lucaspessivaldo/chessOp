import { useEffect, useState, type ReactNode } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronLeft, User, Volume2, VolumeX } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { updateSettings, useSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'

export function LogoMark({ className }: { className?: string }) {
  return (
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center bg-ink text-ink-foreground', className)}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path d="M19 22H5v-2h14v2M13 2c-1.25 0-2.42.62-3.11 1.66L7 8l2 2 2.06-2.06C11.28 8.72 12 9.81 12 11v5h2V11c0-1.06-.27-2.07-.75-2.94L17 4.5 15.5 3l-2.06 2.06C13.16 4.44 12.87 4 12.5 3.65 12.08 3.25 11.55 3 11 3h2V2z" />
      </svg>
    </span>
  )
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark className={inverted ? 'bg-white text-black' : undefined} />
      <span className="font-display text-xl tracking-wide">ChessOp</span>
    </span>
  )
}

/** Square icon button used in every header */
export function HeaderIconButton({ className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary',
        className
      )}
      {...props}
    />
  )
}

export function SoundToggle({ className }: { className?: string }) {
  const { soundEnabled } = useSettings()
  const label = soundEnabled ? 'Mute sounds' : 'Unmute sounds'
  return (
    <HeaderIconButton
      onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
      aria-label={label}
      title={label}
      className={className}
    >
      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </HeaderIconButton>
  )
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('')
}

/** Link to the user area: initials of the display name, or a user icon */
export function UserButton({ className }: { className?: string }) {
  const { displayName } = useSettings()
  const short = initials(displayName)
  const label = displayName.trim() ? `${displayName.trim()} — your area` : 'Your area'

  return (
    <Link
      to="/settings"
      aria-label={label}
      title={label}
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center bg-ink text-[11px] font-bold tracking-wide text-ink-foreground transition-opacity hover:opacity-85',
        'data-[status=active]:outline-2 data-[status=active]:outline-offset-2 data-[status=active]:outline-action',
        className
      )}
    >
      {short || <User className="h-4 w-4" />}
    </Link>
  )
}

type Section = 'openings' | 'trainings' | 'settings' | null

function useActiveSection(): Section {
  return useRouterState({
    select: s => {
      if (s.location.pathname.startsWith('/settings')) return 'settings'
      if (!s.location.pathname.startsWith('/openings')) return null
      const search = s.location.search as { tab?: string; trainingId?: string }
      return search.tab === 'trainings' || search.trainingId ? 'trainings' : 'openings'
    },
  })
}

/** The scroll container of the app (see __root.tsx) */
function useScrolled(threshold: number, enabled: boolean) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    if (!enabled) return
    const container = document.querySelector('main')
    if (!container) return
    const update = () => setScrolled(container.scrollTop > threshold)
    update()
    container.addEventListener('scroll', update, { passive: true })
    return () => container.removeEventListener('scroll', update)
  }, [threshold, enabled])
  return scrolled
}

interface NavbarProps {
  /** Transparent over a dark hero until the page scrolls */
  overlay?: boolean
}

export function Navbar({ overlay = false }: NavbarProps) {
  const active = useActiveSection()
  const scrolled = useScrolled(24, overlay)
  const onHero = overlay && !scrolled

  const linkClass = (section: Section) =>
    cn(
      'relative flex h-full items-center px-2.5 text-xs font-semibold uppercase tracking-[0.14em] transition-colors sm:px-3',
      'after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:transition-colors sm:after:inset-x-3',
      active === section
        ? onHero ? 'text-white after:bg-white' : 'text-text-primary after:bg-ink'
        : onHero ? 'text-white/65 after:bg-transparent hover:text-white' : 'text-text-muted after:bg-transparent hover:text-text-primary'
    )

  return (
    <nav
      className={cn(
        'safe-top fixed inset-x-0 top-0 z-50 border-b transition-colors duration-200',
        onHero
          ? 'border-white/10 bg-transparent text-white'
          : 'border-border-subtle bg-surface-0/90 text-text-primary backdrop-blur-md'
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:px-6">
        <Link to="/" aria-label="ChessOp home" className="mr-auto">
          <Logo inverted={onHero} />
        </Link>

        <div className="flex h-full items-stretch">
          <Link to="/openings" search={{}} className={linkClass('openings')}>
            Openings
          </Link>
          <Link to="/openings" search={{ tab: 'trainings' }} className={linkClass('trainings')}>
            Trainings
          </Link>
        </div>

        <div className={cn('mx-1 hidden h-5 w-px sm:block', onHero ? 'bg-white/20' : 'bg-border-strong')} />
        <ThemeToggle className={cn('hidden sm:flex', onHero && 'text-white/70 hover:bg-white/10 hover:text-white')} />
        <UserButton className={onHero ? 'bg-white text-black' : undefined} />
      </div>
    </nav>
  )
}

interface WorkspaceHeaderProps {
  /** Breadcrumb parent, e.g. "Openings" */
  backLabel: string
  onBack: () => void
  title: string
  /** Shown before the title (e.g. the color badge) */
  titleIcon?: ReactNode
  subtitle?: ReactNode
  /** Tabs or other content between the title and the actions */
  children?: ReactNode
  /** Extra buttons before the sound / theme / user controls */
  actions?: ReactNode
}

/**
 * Header of the full-screen pages (a study, a training): breadcrumb, optional tabs and the global controls
 */
export function WorkspaceHeader({ backLabel, onBack, title, titleIcon, subtitle, children, actions }: WorkspaceHeaderProps) {
  return (
    <header className="safe-top sticky top-0 z-40 border-b border-border-subtle bg-surface-0/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-7xl items-stretch gap-2 px-2 md:px-6 lg:h-14">
        <div className="flex min-w-0 shrink items-center gap-2 lg:max-w-[340px]">
          <Link to="/" aria-label="ChessOp home" className="hidden lg:block">
            <LogoMark />
          </Link>
          <button
            type="button"
            onClick={onBack}
            aria-label={`Back to ${backLabel.toLowerCase()}`}
            className="flex shrink-0 items-center gap-1 py-1.5 pr-1 pl-1 text-xs font-semibold uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text-primary lg:pl-0"
          >
            <ChevronLeft className="h-4 w-4 lg:hidden" />
            <span className="hidden sm:inline">{backLabel}</span>
          </button>
          <span className="hidden text-text-muted sm:inline" aria-hidden>/</span>
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            {titleIcon}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{title}</p>
              {subtitle && <p className="truncate text-[11px] leading-tight text-text-muted">{subtitle}</p>}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-stretch">{children}</div>

        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <SoundToggle />
          <ThemeToggle className="hidden sm:flex" />
          <div className="mx-1 hidden h-5 w-px bg-border-strong sm:block" />
          <UserButton className="hidden sm:flex" />
        </div>
      </div>
    </header>
  )
}

interface WorkspaceTab<T extends string> {
  id: T
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

/** Mode tabs of a workspace header: underlined and uppercase; on narrow screens the other tabs are icon-only */
export function WorkspaceTabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: WorkspaceTab<T>[]
  active: T
  onChange: (id: T) => void
  label: string
}) {
  return (
    <nav className="scroll-tabs h-full flex-1 md:justify-center" aria-label={label}>
      {tabs.map(({ id, label: tabLabel, icon: Icon, badge }) => {
        const current = id === active
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-current={current ? 'page' : undefined}
            aria-label={tabLabel}
            title={tabLabel}
            className={cn(
              'relative flex shrink-0 items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-[0.1em] transition-colors md:px-3.5',
              'after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 md:after:inset-x-3',
              current ? 'text-text-primary after:bg-ink' : 'text-text-muted after:bg-transparent hover:text-text-primary'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {/* Narrow screens only label the current tab */}
            <span className={current ? undefined : 'hidden sm:inline'}>{tabLabel}</span>
            {badge !== undefined && badge > 0 && (
              <span className="min-w-4 bg-accent-danger px-1 text-center text-[10px] font-bold leading-4 tracking-normal text-white tabular-nums">
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}
