import captureSound from '@/assets/audios/capture.mp3'
import castleSound from '@/assets/audios/castle.mp3'
import checkSound from '@/assets/audios/move-check.mp3'
import moveSound from '@/assets/audios/move-self.mp3'
import promoteSound from '@/assets/audios/promote.mp3'
import correctSound from '@/assets/audios/correct2.mp3'
import wrongSound from '@/assets/audios/wrong.mp3'

export type SoundType = 'move' | 'capture' | 'castle' | 'check' | 'promote' | 'correct' | 'wrong'

const sounds: Record<SoundType, string> = {
  move: moveSound,
  capture: captureSound,
  castle: castleSound,
  check: checkSound,
  promote: promoteSound,
  correct: correctSound,
  wrong: wrongSound,
}

const audioCache: Map<SoundType, HTMLAudioElement> = new Map()

/**
 * Get or create an audio element for a sound type
 */
function getAudio(type: SoundType): HTMLAudioElement {
  let audio = audioCache.get(type)
  if (!audio) {
    audio = new Audio(sounds[type])
    audioCache.set(type, audio)
  }
  return audio
}

/**
 * Play a chess sound effect
 */
export function playSound(type: SoundType): void {
  const audio = getAudio(type)
  audio.currentTime = 0
  audio.play().catch(() => {
    // Ignore errors (e.g., user hasn't interacted with the page yet)
  })
}

/**
 * Determine which sound to play based on move properties
 */
export function getMoveSound(options: {
  isCapture?: boolean
  isCastle?: boolean
  isCheck?: boolean
  isPromotion?: boolean
}): SoundType {
  const { isCapture, isCastle, isCheck, isPromotion } = options

  // Priority: check > promote > castle > capture > move
  if (isCheck) return 'check'
  if (isPromotion) return 'promote'
  if (isCastle) return 'castle'
  if (isCapture) return 'capture'
  return 'move'
}
