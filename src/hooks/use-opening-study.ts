import { useCallback, useMemo, useState } from 'react'
import type { Key } from '@lichess-org/chessground/types'
import type { DrawShape } from '@lichess-org/chessground/draw'
import type { OpeningStudy } from '@/types/opening'
import { extractStudyLines, type StudyLine } from '@/lib/opening-utils'
import { createNagShape } from '@/chess/nag-shapes'
import { buildBoardConfig, useLinePlayer } from '@/hooks/use-line-player'

const EMPTY_LINE: StudyLine = { key: 'empty', nodes: [], uci: [], startFen: '', isSetup: false, label: '' }

/**
 * Guided study: walk through every line of the repertoire, the expected move is shown with an arrow
 */
export function useOpeningStudy({ study }: { study: OpeningStudy }) {
  const lines = useMemo(() => extractStudyLines(study), [study])
  const [lineIndex, setLineIndex] = useState(0)
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(() => new Set())

  const currentLine = lines[lineIndex] ?? EMPTY_LINE

  const player = useLinePlayer({
    initialLine: { uci: currentLine.uci, startFen: currentLine.startFen || study.rootFen },
    userColor: study.color,
    onlyExpectedMove: true,
    onComplete: () => setCompletedKeys(prev => new Set(prev).add(currentLine.key)),
  })
  const { load } = player

  const selectLine = useCallback((index: number) => {
    const line = lines[index]
    if (!line) return
    setLineIndex(index)
    load({ uci: line.uci, startFen: line.startFen })
  }, [lines, load])

  const restartLine = useCallback(() => selectLine(lineIndex), [selectLine, lineIndex])
  const nextLine = useCallback(() => selectLine(lineIndex + 1), [selectLine, lineIndex])
  const previousLine = useCallback(() => selectLine(lineIndex - 1), [selectLine, lineIndex])
  const restartStudy = useCallback(() => {
    setCompletedKeys(new Set())
    selectLine(0)
  }, [selectLine])

  const lastNode = player.moveIndex > 0 ? currentLine.nodes[player.moveIndex - 1] : undefined
  const upcomingNode = player.isUserTurn ? currentLine.nodes[player.moveIndex] : undefined

  const autoShapes = useMemo((): DrawShape[] => {
    const shapes: DrawShape[] = []
    for (const shape of lastNode?.shapes ?? []) {
      shapes.push({ orig: shape.orig as Key, dest: shape.dest as Key | undefined, brush: shape.brush })
    }
    if (lastNode?.nags?.length) {
      const nagShape = createNagShape(lastNode.uci.slice(2, 4) as Key, lastNode.nags[0])
      if (nagShape) shapes.push(nagShape)
    }
    if (player.expectedUci) {
      shapes.push({
        orig: player.expectedUci.slice(0, 2) as Key,
        dest: player.expectedUci.slice(2, 4) as Key,
        brush: 'green',
      })
    }
    return shapes
  }, [lastNode, player.expectedUci])

  const chessgroundConfig = useMemo(
    () => buildBoardConfig(player.state, { orientation: study.color, autoShapes }),
    [player.state, study.color, autoShapes]
  )

  // Explanation for the move about to be played, plus the comment on the opponent's last move
  const lastMoveIsOpponent = !!lastNode && player.isUserTurn
  const opponentComment = lastMoveIsOpponent ? lastNode?.comment ?? null : null
  const upcomingComment = upcomingNode?.comment ?? null

  const isLineComplete = player.isComplete && currentLine.nodes.length > 0
  const isStudyComplete = lines.length > 0 && lines.every(line => completedKeys.has(line.key))

  return {
    lines,
    currentLine,
    lineIndex,
    completedKeys,
    moveIndex: player.moveIndex,
    isUserTurn: player.isUserTurn,
    isLineComplete,
    isStudyComplete,
    upcomingComment,
    opponentComment,
    selectLine,
    restartLine,
    nextLine,
    previousLine,
    restartStudy,
    makeMove: player.handleBoardMove,
    pendingPromotion: player.pendingPromotion,
    completePromotion: player.completePromotion,
    cancelPromotion: player.cancelPromotion,
    chessgroundConfig,
  }
}
