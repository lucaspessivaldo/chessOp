import { useEffect, useState, useSyncExternalStore } from 'react'
import { readJson, writeJson } from '@/lib/storage'

/**
 * User preferences, persisted in localStorage and observable from React
 */
export interface Settings {
  /** Play move/feedback sounds */
  soundEnabled: boolean
  /** Personal Lichess API token, required by the Lichess opening explorer */
  lichessToken: string
  /** Color theme; 'system' follows the OS preference */
  theme: 'system' | 'light' | 'dark'
  /** Run Stockfish in the editor */
  engineEnabled: boolean
  /** Draw the engine's best move on the editor board */
  engineArrow: boolean
}

const STORAGE_KEY = 'chessop-settings'
const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  lichessToken: '',
  theme: 'system',
  engineEnabled: true,
  engineArrow: true,
}

let current: Settings = { ...DEFAULT_SETTINGS, ...readJson<Partial<Settings>>(STORAGE_KEY, {}) }
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  return current
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch }
  writeJson(STORAGE_KEY, current)
  listeners.forEach(listener => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * React hook returning the current settings (re-renders on change)
 */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}

// ===== Theme =====

const darkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

export function resolveTheme(theme: Settings['theme'] = current.theme): 'light' | 'dark' {
  if (theme === 'system') return darkQuery?.matches ? 'dark' : 'light'
  return theme
}

/**
 * Apply the theme to <html> and keep it in sync with settings and the OS preference.
 * (index.html applies it once before first paint to avoid a flash.)
 */
export function initTheme(): void {
  const apply = () => {
    const resolved = resolveTheme()
    document.documentElement.dataset.theme = resolved
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#16181b' : '#fafbfc')
  }
  apply()
  listeners.add(apply)
  darkQuery?.addEventListener('change', apply)
}

/**
 * React hook returning the resolved theme (re-renders on change)
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const settings = useSettings()
  const [, rerender] = useState(0)
  useEffect(() => {
    const onChange = () => rerender(n => n + 1)
    darkQuery?.addEventListener('change', onChange)
    return () => darkQuery?.removeEventListener('change', onChange)
  }, [])
  return resolveTheme(settings.theme)
}
