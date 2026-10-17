import { Moon, Sun } from 'lucide-react'
import { updateSettings, useResolvedTheme } from '@/lib/settings'
import { cn } from '@/lib/utils'

/**
 * Switch between light and dark theme
 */
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useResolvedTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => updateSettings({ theme: next })}
      className={cn(
        'rounded-md p-2 text-text-secondary transition-colors hover:bg-surface-2 hover:text-text-primary',
        className
      )}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
