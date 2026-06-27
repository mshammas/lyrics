import { LANGUAGE_BCP47 } from '@/types'
import type { Language } from '@/types'
import { findBestLine } from './fuzzy-match'

export interface STTOptions {
  language: Language
  lines: string[]
  onLineMatch: (lineIndex: number) => void
  onTranscript?: (text: string) => void
  onError?: (msg: string) => void
  lookAheadWindow?: number
  stallTimeoutMs?: number
  onStall?: () => void
}

export interface STTController {
  stop: () => void
  setActiveIndex: (index: number) => void
}

// Minimal Web Speech API types (not in all TS DOM versions)
interface SpeechRecognitionResult {
  readonly length: number
  readonly isFinal: boolean
  [index: number]: { readonly transcript: string; readonly confidence: number }
}

interface SpeechRecognitionResultList {
  readonly length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number
  readonly results: SpeechRecognitionResultList
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string
}

interface SpeechRecognitionInstance extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstance

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionCtor | undefined
    webkitSpeechRecognition: SpeechRecognitionCtor | undefined
  }
}

// Minimum words needed in the rolling transcript before attempting a match.
// Prevents single stray words (music bleed, noise) from cascading advances.
const MIN_WORDS_TO_MATCH = 3

// After matching a line, ignore further matches for this many ms.
// Prevents the next interim STT result from immediately triggering another advance.
const MATCH_COOLDOWN_MS = 1200

export function startSTT(
  currentLineIndex: number,
  opts: STTOptions
): STTController | null {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
  if (!SR) {
    opts.onError?.('Speech recognition is not supported in this browser.')
    return null
  }

  const rec = new SR()
  rec.lang = LANGUAGE_BCP47[opts.language]
  rec.continuous = true
  rec.interimResults = true
  rec.maxAlternatives = 1

  let activeIndex = currentLineIndex
  let transcript = ''
  let stallTimer: ReturnType<typeof setTimeout> | null = null
  let stopped = false
  let cooldownUntil = 0

  const resetStallTimer = () => {
    if (stallTimer) clearTimeout(stallTimer)
    if (opts.stallTimeoutMs && opts.onStall) {
      stallTimer = setTimeout(opts.onStall, opts.stallTimeoutMs)
    }
  }

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i]
      // Use only the most confident alternative (index 0)
      const text = r[0].transcript
      if (r.isFinal) {
        transcript += ' ' + text
        const words = transcript.trim().split(/\s+/)
        if (words.length > 40) transcript = words.slice(-20).join(' ')
      } else {
        interim = text
      }
    }
    opts.onTranscript?.(interim || transcript.trim())

    // Don't attempt matching if we're in the post-match cooldown
    if (Date.now() < cooldownUntil) return

    const combined = (transcript + ' ' + interim).trim()

    // Require a minimum number of meaningful words before attempting a match.
    // Single stray words from music or noise should never advance the line.
    const wordCount = combined.split(/\s+/).filter(w => w.length > 1).length
    if (wordCount < MIN_WORDS_TO_MATCH) return

    const lookAhead = opts.lines.slice(
      activeIndex + 1,
      activeIndex + 1 + (opts.lookAheadWindow ?? 4)
    )
    const rel = findBestLine(combined, lookAhead)
    if (rel >= 0) {
      activeIndex = activeIndex + 1 + rel
      opts.onLineMatch(activeIndex)
      transcript = ''
      cooldownUntil = Date.now() + MATCH_COOLDOWN_MS
      resetStallTimer()
    }
  }

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (stopped) return
    if (event.error === 'network' || event.error === 'no-speech') {
      rec.start()
    } else {
      opts.onError?.(event.error)
    }
  }

  rec.onend = () => {
    if (!stopped) rec.start()
  }

  rec.start()
  resetStallTimer()

  return {
    stop: () => {
      stopped = true
      if (stallTimer) clearTimeout(stallTimer)
      rec.stop()
    },
    setActiveIndex: (index: number) => {
      activeIndex = index
      transcript = ''
      cooldownUntil = 0
    },
  }
}
