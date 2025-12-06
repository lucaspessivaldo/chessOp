export interface Puzzle {
  PuzzleId: string
  FEN: string
  Moves: string
  Rating: string
  RatingDeviation: string
  Popularity: string
  NbPlays: string
  Themes: string
  GameUrl: string
  OpeningTags: string
}

export type PuzzleStatus = 'playing' | 'completed' | 'failed'
