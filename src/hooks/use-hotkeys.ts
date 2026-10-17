import { useEffect, useLayoutEffect, useRef } from 'react'

type HotkeyMap = Record<string, (() => void) | undefined | false>

/**
 * Bind single-key shortcuts (e.g. { h: showHint, ArrowRight: next }).
 * Ignored while typing in inputs or when a modifier key is held.
 */
export function useHotkeys(map: HotkeyMap) {
  const mapRef = useRef(map)
  useLayoutEffect(() => {
    mapRef.current = map
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return
      if (document.querySelector('[role="dialog"][aria-modal="true"], [data-state="open"][role="dialog"]')) return

      const handler = mapRef.current[e.key] ?? mapRef.current[e.key.toLowerCase()]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
