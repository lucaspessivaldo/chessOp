/**
 * Represents a single move node in the opening tree
 */
export interface OpeningMoveNode {
  /** Unique identifier for this node */
  id: string
  /** Move in SAN notation (e.g., "e4") */
  san: string
  /** Move in UCI notation (e.g., "e2e4") */
  uci: string
  /** Position FEN after this move */
  fen: string
  /** Optional commentary for study mode */
  comment?: string
  /** NAG annotations (!, ?, !!, ??, !?, ?!) as strings */
  nags?: string[]
  /** Variations/continuations from this position */
  children: OpeningMoveNode[]
  /** Whether this move is part of the main line */
  isMainLine: boolean
}

/**
 * Complete opening study created or loaded by user
 */
export interface OpeningStudy {
  /** Unique identifier */
  id: string
  /** Opening name (e.g., "Ruy Lopez") */
  name: string
  /** Optional description */
  description?: string
  /** Which side the user plays */
  color: 'white' | 'black'
  /** Starting position FEN (usually initial position) */
  rootFen: string
  /** Root-level moves (first moves of the opening) */
  moves: OpeningMoveNode[]
  /** Creation timestamp */
  createdAt: number
  /** Last update timestamp */
  updatedAt: number
}

/**
 * Predefined opening with PGN data
 */
export interface PredefinedOpening {
  /** Unique identifier */
  id: string
  /** Opening name */
  name: string
  /** ECO code (e.g., "C65") */
  eco: string
  /** PGN string with variations and comments */
  pgn: string
  /** Which side the user plays */
  color: 'white' | 'black'
  /** Description of the opening */
  description: string
}

/** Mode for the opening page */
export type OpeningMode = 'study' | 'practice'

/** Status during practice mode */
export type PracticeStatus = 'playing' | 'completed' | 'line-complete'

/** NAG annotation codes */
export const NAG_SYMBOLS: Record<string, string> = {
  '$1': '!',    // Good move
  '$2': '?',    // Poor move
  '$3': '!!',   // Brilliant move
  '$4': '??',   // Blunder
  '$5': '!?',   // Interesting move
  '$6': '?!',   // Dubious move
  '$10': '=',   // Equal position
  '$14': '+=',  // White slightly better
  '$15': '=+',  // Black slightly better
  '$16': '±',   // White clearly better
  '$17': '∓',   // Black clearly better
  '$18': '+-',  // White winning
  '$19': '-+',  // Black winning
}
