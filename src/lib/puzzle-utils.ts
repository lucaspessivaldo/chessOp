import type { Puzzle } from '@/types/puzzle'

/**
 * Load puzzles from the JSON file
 */
export async function loadPuzzles(): Promise<Puzzle[]> {
  const response = await fetch('/puzzles.json')
  return response.json()
}

/**
 * Parse moves string into array of UCI moves
 * "f2g3 e6e7 b2b1" → ['f2g3', 'e6e7', 'b2b1']
 */
export function parseMoves(movesString: string): string[] {
  return movesString.trim().split(' ')
}

/**
 * Get user's color based on FEN
 * The user plays the second move (index 1)
 * If FEN shows white to move, machine plays white first → user is black
 * If FEN shows black to move, machine plays black first → user is white
 */
export function getUserColor(fen: string): 'white' | 'black' {
  const parts = fen.split(' ')
  const sideToMove = parts[1] // 'w' or 'b'

  // Machine plays first (index 0), so if white to move, machine is white → user is black
  return sideToMove === 'w' ? 'black' : 'white'
}
