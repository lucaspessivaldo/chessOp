import { Chessground } from '@/components/chessground'

// Caro-Kann main line after 5.Ng3, with the repertoire reply 5...Bg6 suggested
const PREVIEW_CONFIG = {
  fen: 'rn1qkbnr/pp2pppp/2p5/5b2/3P4/6N1/PPP2PPP/R1BQKBNR b KQkq - 2 5',
  orientation: 'black' as const,
  viewOnly: true,
  coordinates: false,
  lastMove: ['e4', 'g3'] as ['e4', 'g3'],
  drawable: {
    enabled: false,
    autoShapes: [{ orig: 'f5' as const, dest: 'g6' as const, brush: 'green' }],
  },
}

/**
 * Static board used on the landing page (lazy-loaded)
 */
export default function BoardPreview() {
  return <Chessground config={PREVIEW_CONFIG} />
}
