import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'

/**
 * NAG (Numeric Annotation Glyph) types for chess move annotations
 */
export type NagSymbol =
  | '!' // Good move
  | '!!' // Brilliant move
  | '?!' // Inaccuracy
  | '?' // Mistake
  | '??' // Blunder
  | '□' // Only move
  | '=' // Equal position
  | '∞' // Unclear position
  | '+=' // Slight advantage white
  | '=+' // Slight advantage black
  | '+/-' // Clear advantage white
  | '-/+' // Clear advantage black
  | '+-' // Winning for white
  | '-+' // Winning for black

/**
 * NAG number to symbol mapping (standard PGN NAG codes)
 */
export const nagNumberToSymbol: Record<number, NagSymbol> = {
  1: '!',
  2: '?',
  3: '!!',
  4: '??',
  6: '?!',
  7: '□',
  10: '=',
  13: '∞',
  14: '+=',
  15: '=+',
  16: '+/-',
  17: '-/+',
  18: '+-',
  19: '-+',
}

/**
 * PGN NAG string ($1, $2, etc.) to symbol mapping
 */
export const pgnNagToSymbol: Record<string, NagSymbol> = {
  '$1': '!',
  '$2': '?',
  '$3': '!!',
  '$4': '??',
  '$6': '?!',
  '$7': '□',
  '$10': '=',
  '$13': '∞',
  '$14': '+=',
  '$15': '=+',
  '$16': '+/-',
  '$17': '-/+',
  '$18': '+-',
  '$19': '-+',
}

/**
 * SVG definitions for NAG glyphs
 * These are positioned at the top-right corner of a square using a 100x100 viewBox
 * Move quality NAGs (!, !!, ?, ??, ?!) use SVGs from public folder
 */
const nagSvgMap: Record<string, { html: string }> = {
  // Brilliant (!!) - from public/brilliant.svg
  '!!': {
    html: `
<g transform="translate(68 2) scale(1.7)">
  <path opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path>
  <path fill="#26c2a3" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path>
  <g>
    <path fill="#fff" d="M12.57,14.1a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0L10,14.34A.41.41,0,0,1,10,14.1V12.2A.32.32,0,0,1,10,12a.39.39,0,0,1,.1-.08l.13,0h2a.31.31,0,0,1,.24.1.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13Zm-.12-3.93a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H10.35a.31.31,0,0,1-.34-.31L9.86,3.4A.36.36,0,0,1,10,3.16a.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H12.3a.32.32,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path>
    <path fill="#fff" d="M8.07,14.1a.51.51,0,0,1,0,.13.44.44,0,0,1-.08.11l-.11.08-.13,0h-2l-.13,0-.11-.08a.41.41,0,0,1-.08-.24V12.2a.27.27,0,0,1,0-.13.36.36,0,0,1,.07-.1.39.39,0,0,1,.1-.08l.13,0h2A.31.31,0,0,1,8,12a.39.39,0,0,1,.08.1.51.51,0,0,1,0,.13ZM8,10.17a.17.17,0,0,1,0,.12.41.41,0,0,1-.07.11.4.4,0,0,1-.23.08H5.85a.31.31,0,0,1-.34-.31L5.36,3.4a.36.36,0,0,1,.09-.24.23.23,0,0,1,.11-.08.27.27,0,0,1,.13,0H7.8a.35.35,0,0,1,.25.1.36.36,0,0,1,.09.24Z"></path>
  </g>
</g>
`,
  },

  // Good move (!) - from public/best.svg
  '!': {
    html: `
<g transform="translate(68 2) scale(1.7)">
  <path opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path>
  <path fill="#81B64C" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path>
  <path fill="#fff" d="M9,2.93A.5.5,0,0,0,8.73,3a.46.46,0,0,0-.17.22L7.24,6.67l-3.68.19A.52.52,0,0,0,3.3,7a.53.53,0,0,0-.16.23.45.45,0,0,0,0,.28.44.44,0,0,0,.15.23L6.15,10l-1,3.56a.45.45,0,0,0,0,.28.46.46,0,0,0,.17.22.41.41,0,0,0,.26.09.43.43,0,0,0,.27-.08l3.09-2,3.09,2a.46.46,0,0,0,.53,0,.46.46,0,0,0,.17-.22.53.53,0,0,0,0-.28l-1-3.56L14.71,7.7a.44.44,0,0,0,.15-.23.45.45,0,0,0,0-.28A.53.53,0,0,0,14.7,7a.52.52,0,0,0-.26-.1l-3.68-.2L9.44,3.23A.46.46,0,0,0,9.27,3,.5.5,0,0,0,9,2.93Z"></path>
</g>
`,
  },

  // Inaccuracy (?!) - from public/inaccuracy.svg
  '?!': {
    html: `
<g transform="translate(68 2) scale(1.7)">
  <path opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path>
  <path fill="#F7C631" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path>
  <g>
    <path fill="#fff" d="M13.66,14.3a.28.28,0,0,1,0,.13.23.23,0,0,1-.08.11.28.28,0,0,1-.11.08l-.12,0h-2l-.13,0a.27.27,0,0,1-.1-.08A.36.36,0,0,1,11,14.3V12.4a.59.59,0,0,1,0-.13.36.36,0,0,1,.07-.1l.1-.08.13,0h2a.33.33,0,0,1,.23.1.39.39,0,0,1,.08.1.28.28,0,0,1,0,.13Zm-.12-3.93a.31.31,0,0,1,0,.13.3.3,0,0,1-.07.1.3.3,0,0,1-.23.08H11.43a.31.31,0,0,1-.34-.31L10.94,3.6A.5.5,0,0,1,11,3.36l.11-.08.13,0h2.11a.35.35,0,0,1,.26.1.41.41,0,0,1,.08.24Z"></path>
    <path fill="#fff" d="M7.65,14.32a.27.27,0,0,1,0,.12.26.26,0,0,1-.07.11l-.1.07-.13,0H5.43a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08.31.31,0,0,1-.09-.22V12.49a.36.36,0,0,1,.09-.23l.1-.07.12,0H7.32a.32.32,0,0,1,.23.09.3.3,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73,5.58,5.58,0,0,1-.49.6A4.85,4.85,0,0,1,8.48,9a8,8,0,0,0-.65.63,1,1,0,0,0-.27.7v.22a.21.21,0,0,1,0,.12.17.17,0,0,1-.06.1.23.23,0,0,1-.1.07l-.12,0H5.53a.21.21,0,0,1-.12,0,.18.18,0,0,1-.1-.07.2.2,0,0,1-.08-.1.37.37,0,0,1,0-.12v-.35a2.68,2.68,0,0,1,.13-.84,2.91,2.91,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.84,7.84,0,0,0,.65-.64,1,1,0,0,0,.25-.67.77.77,0,0,0-.07-.34.67.67,0,0,0-.23-.27,1.16,1.16,0,0,0-.72-.24A1.61,1.61,0,0,0,6,5.61a3,3,0,0,0-.41.18A1.75,1.75,0,0,0,5.3,6l-.11.09A.5.5,0,0,1,5,6.12.31.31,0,0,1,4.74,6l-1-1.21a.3.3,0,0,1,0-.4A1.36,1.36,0,0,1,4,4.18a3.07,3.07,0,0,1,.56-.38,5.49,5.49,0,0,1,.9-.37,3.69,3.69,0,0,1,1.19-.17A3.92,3.92,0,0,1,8.93,4a2.85,2.85,0,0,1,.77.92A2.82,2.82,0,0,1,10,6.21,3,3,0,0,1,9.85,7.15Z"></path>
  </g>
</g>
`,
  },

  // Mistake (?) - from public/mistake.svg
  '?': {
    html: `
<g transform="translate(68 2) scale(1.7)">
  <path opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path>
  <path fill="#FFA459" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path>
  <path fill="#fff" d="M9.92,14.52a.27.27,0,0,1,0,.12.41.41,0,0,1-.07.11.32.32,0,0,1-.23.09H7.7a.25.25,0,0,1-.12,0,.27.27,0,0,1-.1-.08.31.31,0,0,1-.09-.22V12.69a.32.32,0,0,1,.09-.23l.1-.07.12,0H9.59a.32.32,0,0,1,.23.09.61.61,0,0,1,.07.1.28.28,0,0,1,0,.13Zm2.2-7.17a3.1,3.1,0,0,1-.36.73,5.58,5.58,0,0,1-.49.6,6,6,0,0,1-.52.49,8,8,0,0,0-.65.63,1,1,0,0,0-.27.7v.22a.24.24,0,0,1,0,.12.17.17,0,0,1-.06.1.3.3,0,0,1-.1.07l-.12,0H7.79l-.12,0a.3.3,0,0,1-.1-.07.26.26,0,0,1-.07-.1.37.37,0,0,1,0-.12v-.35a2.42,2.42,0,0,1,.13-.84,2.55,2.55,0,0,1,.33-.66,3.38,3.38,0,0,1,.45-.55c.16-.15.33-.29.49-.42a7.73,7.73,0,0,0,.64-.64,1,1,0,0,0,.26-.67.77.77,0,0,0-.07-.34A.75.75,0,0,0,9.48,6a1.16,1.16,0,0,0-.72-.24,1.61,1.61,0,0,0-.49.07A3,3,0,0,0,7.86,6a1.41,1.41,0,0,0-.29.18l-.11.09a.5.5,0,0,1-.24.06A.31.31,0,0,1,7,6.19L6,5a.29.29,0,0,1,0-.4,1.36,1.36,0,0,1,.21-.2A3.07,3.07,0,0,1,6.81,4a5.38,5.38,0,0,1,.89-.37,3.75,3.75,0,0,1,1.2-.17,4.07,4.07,0,0,1,1.2.19,4,4,0,0,1,1.09.56,2.76,2.76,0,0,1,.78.92,2.82,2.82,0,0,1,.28,1.28A3,3,0,0,1,12.12,7.35Z"></path>
</g>
`,
  },

  // Blunder (??) - from public/blunder.svg
  '??': {
    html: `
<g transform="translate(68 2) scale(1.7)">
  <path opacity="0.3" d="M9,.5a9,9,0,1,0,9,9A9,9,0,0,0,9,.5Z"></path>
  <path fill="#FA412D" d="M9,0a9,9,0,1,0,9,9A9,9,0,0,0,9,0Z"></path>
  <g>
    <path fill="#fff" d="M14.74,5A2.58,2.58,0,0,0,14,4a3.76,3.76,0,0,0-1.09-.56,4.07,4.07,0,0,0-1.2-.19,3.92,3.92,0,0,0-1.18.17,5.87,5.87,0,0,0-.9.37,3,3,0,0,0-.32.2,3.46,3.46,0,0,1,.42.63,3.29,3.29,0,0,1,.36,1.47.31.31,0,0,0,.19-.06L10.37,6a2.9,2.9,0,0,1,.29-.19,3.89,3.89,0,0,1,.41-.17,1.55,1.55,0,0,1,.48-.07,1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26.8.8,0,0,1,.07.34,1,1,0,0,1-.25.67,7.71,7.71,0,0,1-.65.63,6.2,6.2,0,0,0-.48.43,2.93,2.93,0,0,0-.45.54,2.55,2.55,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83v.35a.24.24,0,0,0,0,.12.35.35,0,0,0,.17.17l.12,0h1.71l.12,0a.23.23,0,0,0,.1-.07.21.21,0,0,0,.06-.1.27.27,0,0,0,0-.12V10.3a1,1,0,0,1,.26-.7q.27-.28.66-.63a5.79,5.79,0,0,0,.51-.48,4.51,4.51,0,0,0,.48-.6,2.56,2.56,0,0,0,.36-.72,2.81,2.81,0,0,0,.14-1A2.66,2.66,0,0,0,14.74,5Z"></path>
    <path fill="#fff" d="M12.38,12.15H10.5l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0h1.88a.24.24,0,0,0,.12,0,.26.26,0,0,0,.11-.07.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V12.46a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,12.38,12.15Z"></path>
    <path fill="#fff" d="M6.79,12.15H4.91l-.12,0a.34.34,0,0,0-.18.29v1.82a.36.36,0,0,0,.08.23.23.23,0,0,0,.1.07l.12,0H6.79a.24.24,0,0,0,.12,0A.26.26,0,0,0,7,14.51a.36.36,0,0,0,.07-.1.28.28,0,0,0,0-.13V12.46a.27.27,0,0,0,0-.12.61.61,0,0,0-.07-.1A.32.32,0,0,0,6.79,12.15Z"></path>
    <path fill="#fff" d="M8.39,4A3.76,3.76,0,0,0,7.3,3.48a4.07,4.07,0,0,0-1.2-.19,3.92,3.92,0,0,0-1.18.17,5.87,5.87,0,0,0-.9.37,3.37,3.37,0,0,0-.55.38l-.21.19a.32.32,0,0,0,0,.41l1,1.2a.26.26,0,0,0,.2.12.48.48,0,0,0,.24-.06L4.78,6a2.9,2.9,0,0,1,.29-.19l.4-.17A1.66,1.66,0,0,1,6,5.56a1.1,1.1,0,0,1,.72.24.72.72,0,0,1,.23.26A.77.77,0,0,1,7,6.4a1,1,0,0,1-.26.67,7.6,7.6,0,0,1-.64.63,6.28,6.28,0,0,0-.49.43,2.93,2.93,0,0,0-.45.54,2.72,2.72,0,0,0-.33.66,2.62,2.62,0,0,0-.13.83v.35a.43.43,0,0,0,0,.12.39.39,0,0,0,.08.1.18.18,0,0,0,.1.07.21.21,0,0,0,.12,0H6.72l.12,0a.23.23,0,0,0,.1-.07.36.36,0,0,0,.07-.1.5.5,0,0,0,0-.12V10.3a1,1,0,0,1,.27-.7A8,8,0,0,1,8,9c.18-.15.35-.31.52-.48A7,7,0,0,0,9,7.89a3.23,3.23,0,0,0,.36-.72,3.07,3.07,0,0,0,.13-1A2.66,2.66,0,0,0,9.15,5,2.58,2.58,0,0,0,8.39,4Z"></path>
  </g>
</g>
`,
  },

  // Only move (□) - Blue
  '□': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#3b82f6" cx="50" cy="50" r="50" />
  <rect style="fill:none;stroke:#ffffff;stroke-width:8" x="25" y="25" width="50" height="50" />
</g>
`,
  },

  // Equal position (=) - Gray
  '=': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#888888" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff" d="M 20,35 H 80 V 45 H 20 Z M 20,55 H 80 V 65 H 20 Z" />
</g>
`,
  },

  // Unclear position (∞) - Purple
  '∞': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#9333ea" cx="50" cy="50" r="50" />
  <path style="fill:none;stroke:#ffffff;stroke-width:6;stroke-linecap:round" d="M 25,50 C 25,35 35,35 42,42 C 50,50 50,50 58,58 C 65,65 75,65 75,50 C 75,35 65,35 58,42 C 50,50 50,50 42,58 C 35,65 25,65 25,50 Z" />
</g>
`,
  },

  // Slight advantage white (+=) - Light gray with plus
  '+=': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#a0a0a0" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff" d="M 15,40 H 35 V 45 H 15 Z M 15,55 H 35 V 60 H 15 Z M 45,30 H 55 V 45 H 70 V 55 H 55 V 70 H 45 V 55 H 30 V 45 H 45 Z" />
</g>
`,
  },

  // Slight advantage black (=+) - Dark gray with plus
  '=+': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#505050" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff" d="M 15,40 H 35 V 45 H 15 Z M 15,55 H 35 V 60 H 15 Z M 45,30 H 55 V 45 H 70 V 55 H 55 V 70 H 45 V 55 H 30 V 45 H 45 Z" />
</g>
`,
  },

  // Clear advantage white (+/-)
  '+/-': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#d0d0d0" cx="50" cy="50" r="50" />
  <path style="fill:#333333" d="M 20,45 H 45 V 55 H 20 Z M 55,30 H 65 V 45 H 80 V 55 H 65 V 70 H 55 V 55 H 40 V 45 H 55 Z" />
</g>
`,
  },

  // Clear advantage black (-/+)
  '-/+': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#404040" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff" d="M 20,45 H 45 V 55 H 20 Z M 55,30 H 65 V 45 H 80 V 55 H 65 V 70 H 55 V 55 H 40 V 45 H 55 Z" />
</g>
`,
  },

  // Winning for white (+-)
  '+-': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#f0f0f0" cx="50" cy="50" r="50" />
  <path style="fill:#333333" d="M 10,45 H 35 V 55 H 10 Z M 45,30 H 55 V 45 H 70 V 55 H 55 V 70 H 45 V 55 H 30 V 45 H 45 Z M 75,45 H 90 V 55 H 75 Z" />
</g>
`,
  },

  // Winning for black (-+)
  '-+': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#202020" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff" d="M 10,45 H 35 V 55 H 10 Z M 45,30 H 55 V 45 H 70 V 55 H 55 V 70 H 45 V 55 H 30 V 45 H 45 Z M 75,45 H 90 V 55 H 75 Z" />
</g>
`,
  },
}

/**
 * Get the SVG for a NAG symbol
 */
export function getNagSvg(nag: NagSymbol): { html: string } | undefined {
  return nagSvgMap[nag]
}

/**
 * Get the SVG for a NAG number
 */
export function getNagSvgByNumber(nagNumber: number): { html: string } | undefined {
  const symbol = nagNumberToSymbol[nagNumber]
  return symbol ? nagSvgMap[symbol] : undefined
}

/**
 * Convert any NAG format (symbol, $N, or number) to a NagSymbol
 */
export function parseNag(nag: string | number): NagSymbol | undefined {
  // If it's already a symbol
  if (typeof nag === 'string' && nagSvgMap[nag]) {
    return nag as NagSymbol
  }

  // If it's a PGN format ($1, $2, etc.)
  if (typeof nag === 'string' && nag.startsWith('$')) {
    return pgnNagToSymbol[nag]
  }

  // If it's a number
  if (typeof nag === 'number') {
    return nagNumberToSymbol[nag]
  }

  return undefined
}

/**
 * Create a DrawShape for a NAG annotation on a specific square
 * Accepts any NAG format: symbol ('!'), PGN ('$1'), or number (1)
 */
export function createNagShape(square: Key, nag: string | number): DrawShape | undefined {
  const symbol = parseNag(nag)
  if (!symbol) return undefined

  const svg = nagSvgMap[symbol]
  if (!svg) return undefined

  return {
    orig: square,
    customSvg: svg,
  }
}

/**
 * Create a DrawShape for a NAG annotation using NAG number
 */
export function createNagShapeByNumber(square: Key, nagNumber: number): DrawShape | undefined {
  const svg = getNagSvgByNumber(nagNumber)
  if (!svg) return undefined

  return {
    orig: square,
    customSvg: svg,
  }
}

/**
 * Create multiple NAG shapes from a map of squares to NAG symbols
 */
export function createNagShapes(annotations: Map<Key, NagSymbol>): DrawShape[] {
  const shapes: DrawShape[] = []

  annotations.forEach((nag, square) => {
    const shape = createNagShape(square, nag)
    if (shape) {
      shapes.push(shape)
    }
  })

  return shapes
}

/**
 * NAG colors for reference (useful for styling move lists, etc.)
 * Colors match the public SVG files where available
 */
export const nagColors: Record<NagSymbol, string> = {
  '!!': '#26c2a3', // Brilliant - Teal (from brilliant.svg)
  '!': '#81B64C', // Good - Green (from best.svg)
  '?!': '#F7C631', // Inaccuracy - Yellow (from inaccuracy.svg)
  '?': '#FFA459', // Mistake - Orange (from mistake.svg)
  '??': '#FA412D', // Blunder - Red (from blunder.svg)
  '□': '#3b82f6', // Only move - Blue
  '=': '#888888', // Equal - Gray
  '∞': '#9333ea', // Unclear - Purple
  '+=': '#a0a0a0', // Slight white - Light gray
  '=+': '#505050', // Slight black - Dark gray
  '+/-': '#d0d0d0', // Clear white - Very light
  '-/+': '#404040', // Clear black - Very dark
  '+-': '#f0f0f0', // Winning white - Almost white
  '-+': '#202020', // Winning black - Almost black
}
