import type { DrawShape } from '@lichess-org/chessground/draw'
import type { Key } from '@lichess-org/chessground/types'

/**
 * NAG (Numeric Annotation Glyph) types for chess move annotations
 */
export type NagSymbol =
  | '!' // Good move
  | '!!' // Brilliant move
  | '!?' // Interesting move
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
  5: '!?',
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
  '$5': '!?',
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
 */
const nagSvgMap: Record<string, { html: string }> = {
  // Brilliant (!!) - Dark green
  '!!': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#168226" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff;stroke-width:0.8" d="M 30.5,17 H 44 L 41,59 H 33.5 Z M 56,17 H 69.5 L 66.5,59 H 59 Z M 30.5,68 A 6.5,6.5 0 0 1 37,61.5 6.5,6.5 0 0 1 43.5,68 6.5,6.5 0 0 1 37,74.5 6.5,6.5 0 0 1 30.5,68 Z M 56,68 A 6.5,6.5 0 0 1 62.5,61.5 6.5,6.5 0 0 1 69,68 6.5,6.5 0 0 1 62.5,74.5 6.5,6.5 0 0 1 56,68 Z" />
</g>
`,
  },

  // Good move (!) - Green
  '!': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#22ac38" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff;stroke-width:0.8" d="M 43.25,17 H 56.75 L 53.75,59 H 46.25 Z M 43.25,68 A 6.75,6.75 0 0 1 50,61.25 6.75,6.75 0 0 1 56.75,68 6.75,6.75 0 0 1 50,74.75 6.75,6.75 0 0 1 43.25,68 Z" />
</g>
`,
  },

  // Interesting move (!?) - Cyan
  '!?': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#149daf" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff;stroke-width:0.8" d="M 16.5,17 H 30 L 27,59 H 19.5 Z M 16.5,68 A 6.5,6.5 0 0 1 23,61.5 6.5,6.5 0 0 1 29.5,68 6.5,6.5 0 0 1 23,74.5 6.5,6.5 0 0 1 16.5,68 Z M 52,17 c 6.5,0 11.5,1.5 15,4.5 3.5,3 5.25,7.25 5.25,12.75 0,3.5 -0.75,6.5 -2.25,9 -1.5,2.5 -3.75,5 -6.75,7.5 -2.25,1.75 -3.75,3.25 -4.5,4.5 -0.75,1.25 -1.25,2.75 -1.5,4.5 H 46.5 c 0.25,-3 0.75,-5.5 1.5,-7.5 0.75,-2 2.25,-4 4.5,-6 2,-1.75 3.5,-3.25 4.5,-4.5 1,-1.25 1.5,-2.75 1.5,-4.5 0,-2 -0.5,-3.5 -1.5,-4.5 -1,-1 -2.5,-1.5 -4.5,-1.5 -2,0 -3.75,0.5 -5.25,1.5 -1.5,1 -3,2.25 -4.5,3.75 L 36,27.5 c 2,-2 4.5,-3.75 7.5,-5.25 3,-1.5 6.5,-2.25 10.5,-2.25 z M 46,68 A 6.5,6.5 0 0 1 52.5,61.5 6.5,6.5 0 0 1 59,68 6.5,6.5 0 0 1 52.5,74.5 6.5,6.5 0 0 1 46,68 Z" />
</g>
`,
  },

  // Inaccuracy (?!) - Light blue
  '?!': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#56b4e9" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff;stroke-width:0.81934" d="m 37.734375,21.947266 c -3.714341,0 -7.128696,0.463992 -10.242187,1.392578 -3.113493,0.928585 -6.009037,2.130656 -8.685547,3.605468 l 4.34375,8.765626 c 2.348774,-1.201699 4.643283,-2.157093 6.882812,-2.867188 2.239529,-0.710095 4.504676,-1.064453 6.798828,-1.064453 2.294152,0 4.069851,0.463993 5.326172,1.392578 1.310944,0.873963 1.966797,2.185668 1.966797,3.933594 0,1.747925 -0.546219,3.276946 -1.638672,4.58789 -1.037831,1.256322 -2.786121,2.757934 -5.24414,4.50586 -2.785757,2.021038 -4.751362,3.961188 -5.898438,5.818359 -1.147076,1.857171 -1.720703,4.149726 -1.720703,6.88086 v 2.951171 h 10.568359 v -2.376953 c 0,-1.147076 0.137043,-2.10247 0.410156,-2.867187 0.327737,-0.764718 0.928772,-1.557613 1.802735,-2.376953 0.873963,-0.81934 2.103443,-1.802143 3.6875,-2.949219 2.130284,-1.584057 3.905982,-3.058262 5.326172,-4.423828 1.420189,-1.42019 2.485218,-2.951164 3.195312,-4.589844 0.710095,-1.63868 1.064453,-3.576877 1.064453,-5.816406 0,-4.205946 -1.583838,-7.675117 -4.751953,-10.40625 -3.113492,-2.731134 -7.510649,-4.095703 -13.191406,-4.095703 z m 24.744141,0.818359 2.048828,39.083984 h 9.75 L 76.324219,22.765625 Z M 35.357422,68.730469 c -1.966416,0 -3.63248,0.51881 -4.998047,1.55664 -1.365567,0.983208 -2.046875,2.731498 -2.046875,5.244141 0,2.403397 0.681308,4.151687 2.046875,5.244141 1.365567,1.03783 3.031631,1.55664 4.998047,1.55664 1.911793,0 3.550449,-0.51881 4.916016,-1.55664 1.365566,-1.092454 2.048828,-2.840744 2.048828,-5.244141 0,-2.512643 -0.683262,-4.260933 -2.048828,-5.244141 -1.365567,-1.03783 -3.004223,-1.55664 -4.916016,-1.55664 z m 34.003906,0 c -1.966416,0 -3.63248,0.51881 -4.998047,1.55664 -1.365566,0.983208 -2.048828,2.731498 -2.048828,5.244141 0,2.403397 0.683262,4.151687 2.048828,5.244141 1.365567,1.03783 3.031631,1.55664 4.998047,1.55664 1.911793,0 3.550449,-0.51881 4.916016,-1.55664 1.365566,-1.092454 2.046875,-2.840744 2.046875,-5.244141 0,-2.512643 -0.681309,-4.260933 -2.046875,-5.244141 -1.365567,-1.03783 -3.004223,-1.55664 -4.916016,-1.55664 z" />
</g>
`,
  },

  // Mistake (?) - Orange
  '?': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#e69f00" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff;stroke-width:0.932208" d="m 40.435856,60.851495 q 0,-4.661041 1.957637,-7.830548 1.957637,-3.169507 6.711897,-6.618677 4.194937,-2.983065 5.966132,-5.127144 1.864416,-2.237299 1.864416,-5.220365 0,-2.983065 -2.237299,-4.474598 -2.144079,-1.584754 -6.059353,-1.584754 -3.915273,0 -7.737326,1.21187 -3.822053,1.211871 -7.830548,3.262729 L 28.13071,24.495382 q 4.567819,-2.516962 9.881405,-4.101716 5.313586,-1.584753 11.6526,-1.584753 9.694964,0 15.008549,4.66104 5.406807,4.66104 5.406807,11.839042 0,3.822053 -1.21187,6.618677 -1.211871,2.796624 -3.635612,5.220365 -2.423741,2.33052 -6.059352,5.033923 -2.703403,1.957637 -4.194936,3.355949 -1.491533,1.398312 -2.050858,2.703403 -0.466104,1.305091 -0.466104,3.262728 v 2.703403 H 40.435856 Z m -1.491533,18.923822 q 0,-4.288156 2.33052,-5.966131 2.33052,-1.771195 5.686469,-1.771195 3.262728,0 5.593248,1.771195 2.33052,1.677975 2.33052,5.966131 0,4.101716 -2.33052,5.966132 -2.33052,1.771195 -5.593248,1.771195 -3.355949,0 -5.686469,-1.771195 -2.33052,-1.864416 -2.33052,-5.966132 z" />
</g>
`,
  },

  // Blunder (??) - Red
  '??': {
    html: `
<g transform="translate(68 2) scale(0.3)">
  <circle style="fill:#df5353" cx="50" cy="50" r="50" />
  <path style="fill:#ffffff;stroke-width:0.810558" d="m 31.799294,22.220598 c -3.67453,-10e-7 -7.050841,0.460303 -10.130961,1.378935 -3.08012,0.918633 -5.945403,2.106934 -8.593226,3.565938 l 4.297618,8.67363 c 2.3236,-1.188818 4.592722,-2.135794 6.808247,-2.838277 2.215525,-0.702483 4.45828,-1.053299 6.727842,-1.053299 2.269562,0 4.025646,0.460305 5.268502,1.378937 1.296893,0.864596 1.945788,2.160375 1.945788,3.889565 0,1.72919 -0.541416,3.241939 -1.62216,4.538831 -1.026707,1.242856 -2.756423,2.729237 -5.188097,4.458428 -2.755898,1.999376 -4.700572,3.917682 -5.835354,5.754947 -1.13478,1.837266 -1.702564,4.106388 -1.702564,6.808248 v 2.918681 h 10.4566 v -2.34982 c 0,-1.134781 0.135856,-2.081756 0.406042,-2.838277 0.324222,-0.756521 0.918373,-1.539262 1.782969,-2.349819 0.864595,-0.810559 2.079262,-1.783901 3.646342,-2.918683 2.10745,-1.567078 3.863533,-3.025082 5.268501,-4.376012 1.404967,-1.404967 2.459422,-2.919725 3.161905,-4.540841 0.702483,-1.621116 1.053298,-3.539423 1.053298,-5.754948 0,-4.160865 -1.567492,-7.591921 -4.70165,-10.29378 -3.080121,-2.70186 -7.429774,-4.052384 -13.049642,-4.052384 z m 38.66449,0 c -3.67453,-10e-7 -7.05285,0.460303 -10.132971,1.378935 -3.08012,0.918633 -5.943393,2.106934 -8.591215,3.565938 l 4.295608,8.67363 c 2.323599,-1.188818 4.592721,-2.135794 6.808246,-2.838277 2.215526,-0.702483 4.458281,-1.053299 6.727842,-1.053299 2.269563,0 4.025647,0.460305 5.268502,1.378937 1.296893,0.864596 1.945788,2.160375 1.945788,3.889565 0,1.72919 -0.539406,3.241939 -1.62015,4.538831 -1.026707,1.242856 -2.756423,2.729237 -5.188097,4.458428 -2.755897,1.999376 -4.700572,3.917682 -5.835353,5.754947 -1.134782,1.837266 -1.702564,4.106388 -1.702564,6.808248 v 2.918681 h 10.456599 v -2.34982 c 0,-1.134781 0.133846,-2.081756 0.404032,-2.838277 0.324223,-0.756521 0.918374,-1.539262 1.782969,-2.349819 0.864596,-0.810559 2.081273,-1.783901 3.648352,-2.918683 2.107451,-1.567078 3.863534,-3.025082 5.268502,-4.376012 1.404966,-1.404967 2.45942,-2.919725 3.161904,-4.540841 0.702483,-1.621116 1.053299,-3.539423 1.053299,-5.754948 0,-4.160865 -1.567493,-7.591921 -4.701651,-10.29378 -3.08012,-2.70186 -7.429774,-4.052384 -13.049642,-4.052384 z M 29.449473,68.50341 c -1.945339,0 -3.593943,0.513038 -4.944873,1.539744 -1.350931,0.97267 -2.026192,2.702386 -2.026192,5.188098 0,2.377636 0.675261,4.107352 2.026192,5.188097 1.35093,1.026707 2.999534,1.539745 4.944873,1.539745 1.891302,0 3.51153,-0.513038 4.86246,-1.539745 1.35093,-1.080745 2.026192,-2.810461 2.026192,-5.188097 0,-2.485712 -0.675262,-4.215428 -2.026192,-5.188098 -1.35093,-1.026706 -2.971158,-1.539744 -4.86246,-1.539744 z m 38.662481,0 c -1.945339,0 -3.591933,0.513038 -4.942864,1.539744 -1.35093,0.97267 -2.026192,2.702386 -2.026192,5.188098 0,2.377636 0.675262,4.107352 2.026192,5.188097 1.350931,1.026707 2.997525,1.539745 4.942864,1.539745 1.891302,0 3.513539,-0.513038 4.864469,-1.539745 1.350931,-1.080745 2.026192,-2.810461 2.026192,-5.188097 0,-2.485712 -0.675261,-4.215428 -2.026192,-5.188098 -1.35093,-1.026706 -2.973167,-1.539744 -4.864469,-1.539744 z" />
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
 */
export const nagColors: Record<NagSymbol, string> = {
  '!!': '#168226', // Brilliant - Dark green
  '!': '#22ac38', // Good - Green
  '!?': '#149daf', // Interesting - Cyan
  '?!': '#56b4e9', // Inaccuracy - Light blue
  '?': '#e69f00', // Mistake - Orange
  '??': '#df5353', // Blunder - Red
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
