import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from '@/lib/storage'

/**
 * User preferences, persisted in localStorage and observable from React
 */
export interface Settings {
  /** Play move/feedback sounds */
  soundEnabled: boolean
  /** Personal Lichess API token, required by the Lichess opening explorer */
  lichessToken: string
}

const STORAGE_KEY = 'chessop-settings'
const DEFAULT_SETTINGS: Settings = { soundEnabled: true, lichessToken: '' }

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
