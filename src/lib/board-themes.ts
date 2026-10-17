/**
 * Board color themes the user can pick in Settings (applied as CSS variables)
 */
export interface BoardTheme {
  id: string
  name: string
  light: string
  dark: string
  /** Last-move highlight */
  highlight: string
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: 'green', name: 'Green', light: '#ebecd0', dark: '#739552', highlight: 'rgba(255, 255, 51, 0.45)' },
  { id: 'brown', name: 'Brown', light: '#f0d9b5', dark: '#b58863', highlight: 'rgba(155, 199, 0, 0.41)' },
  { id: 'blue', name: 'Blue', light: '#dee3e6', dark: '#8ca2ad', highlight: 'rgba(155, 199, 0, 0.41)' },
  { id: 'slate', name: 'Slate', light: '#dfe4e9', dark: '#8fa3b3', highlight: 'rgba(255, 206, 84, 0.42)' },
  { id: 'mono', name: 'Mono', light: '#e6e6e6', dark: '#8c8c8c', highlight: 'rgba(255, 213, 79, 0.45)' },
  { id: 'ink', name: 'Ink', light: '#d9d9d9', dark: '#4b4b4b', highlight: 'rgba(120, 200, 90, 0.5)' },
  { id: 'purple', name: 'Purple', light: '#efeff5', dark: '#8877b7', highlight: 'rgba(255, 213, 79, 0.45)' },
  { id: 'coral', name: 'Coral', light: '#f1f1e6', dark: '#d37b6b', highlight: 'rgba(255, 213, 79, 0.45)' },
  { id: 'sand', name: 'Sand', light: '#f2e6cf', dark: '#c2a476', highlight: 'rgba(155, 199, 0, 0.41)' },
]

export const DEFAULT_BOARD_THEME = 'green'

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find(theme => theme.id === id) ?? BOARD_THEMES[0]
}

/**
 * Write the theme's colors to CSS variables used by styles/board.css
 */
export function applyBoardTheme(id: string, root: HTMLElement = document.documentElement): void {
  const theme = getBoardTheme(id)
  root.style.setProperty('--board-light', theme.light)
  root.style.setProperty('--board-dark', theme.dark)
  root.style.setProperty('--board-last-move', theme.highlight)
  root.style.setProperty('--board-coord-on-light', theme.dark)
  root.style.setProperty('--board-coord-on-dark', theme.light)
}
