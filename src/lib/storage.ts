/**
 * Safe localStorage helpers: never throw (private mode, quota exceeded, corrupted JSON)
 */

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * Write a JSON value. Returns false when the value could not be stored.
 */
export function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (e) {
    console.error(`Failed to save "${key}":`, e)
    return false
  }
}
