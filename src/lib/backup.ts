/**
 * Export / import every ChessOp record stored in this browser
 */
const PREFIX = 'chessop-'
const SETTINGS_KEY = 'chessop-settings'

export interface Backup {
  app: 'chessop'
  version: 1
  exportedAt: string
  data: Record<string, unknown>
}

/**
 * Collect all ChessOp data. The Lichess token is left out: it's a credential.
 */
export function createBackup(): Backup {
  const data: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(PREFIX)) continue
    try {
      const value = JSON.parse(localStorage.getItem(key) ?? 'null')
      if (key === SETTINGS_KEY && value && typeof value === 'object') {
        const { lichessToken: _token, ...rest } = value as Record<string, unknown>
        void _token
        data[key] = rest
      } else {
        data[key] = value
      }
    } catch {
      // Skip unreadable entries
    }
  }
  return { app: 'chessop', version: 1, exportedAt: new Date().toISOString(), data }
}

export function downloadBackup(): void {
  const backup = createBackup()
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `chessop-backup-${backup.exportedAt.slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

/**
 * Validate a backup file's content. Throws a friendly Error when invalid.
 */
export function parseBackup(text: string): Backup {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const backup = parsed as Partial<Backup>
  if (backup?.app !== 'chessop' || typeof backup.data !== 'object' || !backup.data) {
    throw new Error('This is not a ChessOp backup file.')
  }
  return backup as Backup
}

/**
 * Replace the local data with a backup (the current Lichess token is kept)
 */
export function restoreBackup(backup: Backup): void {
  const token = readToken()
  clearAllData()
  for (const [key, value] of Object.entries(backup.data)) {
    if (!key.startsWith(PREFIX)) continue
    const toWrite = key === SETTINGS_KEY && value && typeof value === 'object'
      ? { ...(value as Record<string, unknown>), lichessToken: token }
      : value
    localStorage.setItem(key, JSON.stringify(toWrite))
  }
}

export function clearAllData(): void {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX)) keys.push(key)
  }
  keys.forEach(key => localStorage.removeItem(key))
}

function readToken(): string {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}').lichessToken ?? ''
  } catch {
    return ''
  }
}
