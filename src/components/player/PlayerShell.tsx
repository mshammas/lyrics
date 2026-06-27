'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Song } from '@/types'
import { startSTT } from '@/lib/stt'
import type { STTController } from '@/lib/stt'
import Toggle from '@/components/ui/Toggle'
import NormalView from './NormalView'
import AutoView from './AutoView'

const STALL_MS = 10_000
const MIN_FONT = 14
const MAX_FONT = 32
const DEFAULT_FONT = 20

function getFontKey(songId: number | undefined) {
  return `lyrics_font_${songId ?? 'default'}`
}

interface Props {
  song: Song
}

export default function PlayerShell({ song }: Props) {
  const router = useRouter()
  const [autoMode, setAutoMode] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [fontSize, setFontSize] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_FONT
    const stored = localStorage.getItem(getFontKey(song.id))
    const n = stored ? Number(stored) : NaN
    return Number.isFinite(n) && n >= MIN_FONT && n <= MAX_FONT ? n : DEFAULT_FONT
  })
  const [showFontPanel, setShowFontPanel] = useState(false)
  const [showStallNudge, setShowStallNudge] = useState(false)
  const [sttStatus, setSttStatus] = useState<'idle' | 'listening' | 'error'>('idle')
  const [transcript, setTranscript] = useState('')
  const [showTranslit, setShowTranslit] = useState(
    song.lyricsDisplay === 'transliteration'
  )

  const sttRef = useRef<STTController | null>(null)
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const changeFontSize = useCallback((n: number) => {
    setFontSize(n)
    localStorage.setItem(getFontKey(song.id), String(n))
  }, [song.id])

  const lines = (() => {
    const src = showTranslit && song.lyricsRoman ? song.lyricsRoman : song.lyrics
    return src.split('\n')
  })()

  const nonEmptyLines = lines.filter(l => l.trim())

  const resetStallTimer = useCallback(() => {
    if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
    stallTimerRef.current = setTimeout(() => setShowStallNudge(true), STALL_MS)
  }, [])

  const advanceLine = useCallback(() => {
    setActiveIndex(i => Math.min(i + 1, lines.length - 1))
    setShowStallNudge(false)
    resetStallTimer()
  }, [lines.length, resetStallTimer])

  const selectLine = useCallback((index: number) => {
    setActiveIndex(index)
    setShowStallNudge(false)
    resetStallTimer()
    sttRef.current?.setActiveIndex(index)
  }, [resetStallTimer])

  useEffect(() => {
    if (!autoMode) {
      sttRef.current?.stop()
      sttRef.current = null
      setSttStatus('idle')
      setTranscript('')
      setShowStallNudge(false)
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
      return
    }

    setSttStatus('listening')
    setShowStallNudge(false)
    resetStallTimer()

    sttRef.current = startSTT(activeIndex, {
      language: song.language,
      lines,
      lookAheadWindow: 4,
      stallTimeoutMs: STALL_MS,
      onLineMatch: idx => {
        setActiveIndex(idx)
        setShowStallNudge(false)
        resetStallTimer()
      },
      onTranscript: t => setTranscript(t),
      onStall: () => setShowStallNudge(true),
      onError: msg => {
        console.warn('STT error:', msg)
        setSttStatus('error')
      },
    })

    return () => {
      sttRef.current?.stop()
      sttRef.current = null
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current)
    }
  }, [autoMode]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasTranslit = !!song.lyricsRoman && song.language !== 'en'

  const darkHeader = autoMode
    ? 'border-white/8 bg-[#1a1a26]'
    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'

  return (
    <div className={`flex flex-col h-dvh ${autoMode ? 'bg-[#0d0d14] text-white' : 'bg-white dark:bg-gray-900'}`}>

      {/* Header — compact in landscape */}
      <div className={`flex items-center gap-2 px-3 py-2 landscape:py-1 border-b shrink-0 ${darkHeader}`}>
        <button
          onClick={() => router.back()}
          className={`p-1 rounded-lg shrink-0 ${autoMode ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm truncate ${autoMode ? 'text-white/80' : 'text-gray-900 dark:text-gray-100'}`}>
            {song.title}
          </p>
          {/* Artist hidden in landscape to save vertical space */}
          {song.artist && (
            <p className={`text-xs truncate landscape:hidden ${autoMode ? 'text-white/40' : 'text-gray-400'}`}>
              {song.artist}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasTranslit && (
            <button
              onClick={() => setShowTranslit(v => !v)}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                autoMode
                  ? 'border-white/20 text-white/50 hover:text-white/80'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-violet-400'
              }`}
              title={showTranslit ? 'Switch to original script' : 'Switch to transliteration'}
            >
              {showTranslit ? 'A→अ' : 'अ→A'}
            </button>
          )}
          <button
            onClick={() => setShowFontPanel(v => !v)}
            className={`p-1 rounded-lg ${autoMode ? 'text-white/40 hover:text-white/70' : 'text-gray-400 hover:text-gray-700'}`}
            aria-label="Font size"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h8M4 12h16M4 18h12" />
            </svg>
          </button>
          <Toggle checked={autoMode} onChange={setAutoMode} id="auto-mode" />
        </div>
      </div>

      {/* Font size panel */}
      {showFontPanel && (
        <div className={`flex items-center gap-3 px-4 py-2 landscape:py-1 border-b shrink-0 ${
          autoMode ? 'border-white/8 bg-[#1a1a26]' : 'border-gray-100 dark:border-gray-800'
        }`}>
          <span className={`text-xs ${autoMode ? 'text-white/40' : 'text-gray-400'}`}>A</span>
          <input
            type="range"
            min={MIN_FONT}
            max={MAX_FONT}
            step={1}
            value={fontSize}
            onChange={e => changeFontSize(Number(e.target.value))}
            className="flex-1 accent-violet-600"
          />
          <span className={`text-base font-semibold ${autoMode ? 'text-white/40' : 'text-gray-600'}`}>A</span>
          <span className={`text-xs w-8 text-center tabular-nums ${autoMode ? 'text-white/40' : 'text-gray-400'}`}>
            {fontSize}px
          </span>
        </div>
      )}

      {/* STT status bar — auto mode only, hidden in landscape to reclaim space */}
      {autoMode && (
        <div className="landscape:hidden flex items-center justify-between px-4 py-1 shrink-0 border-b border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${
              sttStatus === 'listening' ? 'bg-violet-500 animate-pulse' :
              sttStatus === 'error' ? 'bg-red-400' : 'bg-gray-500'
            }`} />
            <span className="text-[11px] text-white/40">
              {sttStatus === 'listening' ? 'listening…' : sttStatus === 'error' ? 'mic error' : 'off'}
            </span>
          </div>
          {transcript && (
            <span className="text-[11px] text-white/25 truncate max-w-[180px] italic">
              &ldquo;{transcript}&rdquo;
            </span>
          )}
          <span className="text-[11px] text-white/25 tabular-nums">
            {activeIndex + 1} / {lines.length}
          </span>
        </div>
      )}

      {/* Lyrics area */}
      <div className="relative flex-1 flex flex-col min-h-0">
        {autoMode ? (
          <AutoView
            lines={lines}
            activeIndex={activeIndex}
            fontSize={fontSize}
            onFontChange={changeFontSize}
            onTap={advanceLine}
            onLineSelect={selectLine}
            showStallNudge={showStallNudge}
          />
        ) : (
          <NormalView lines={lines} fontSize={fontSize} onFontChange={changeFontSize} />
        )}

        {/* Floating zoom buttons */}
        <div className="absolute bottom-4 right-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          {[
            { label: '+', delta: 1, aria: 'Increase font size' },
            { label: '−', delta: -1, aria: 'Decrease font size' },
          ].map(({ label, delta, aria }) => (
            <button
              key={label}
              onPointerDown={e => {
                e.stopPropagation()
                changeFontSize(Math.min(MAX_FONT, Math.max(MIN_FONT, fontSize + delta)))
              }}
              className={`pointer-events-auto w-8 h-8 rounded-full flex items-center justify-center text-base font-bold select-none active:scale-90 transition-transform ${
                autoMode
                  ? 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'
                  : 'bg-black/[0.07] text-gray-400 hover:bg-black/[0.12] hover:text-gray-700 dark:bg-white/10 dark:text-white/40 dark:hover:bg-white/20 dark:hover:text-white'
              }`}
              aria-label={aria}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Credits + YouTube link — normal mode only, hidden in landscape */}
      {!autoMode && (
        <div className="landscape:hidden flex items-center justify-between gap-3 px-5 py-2 border-t border-gray-100 dark:border-gray-800 shrink-0">
          {song.credits ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{song.credits}</p>
          ) : (
            <span />
          )}
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(song.title + ' Karaoke with lyrics')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 shrink-0 font-medium"
            title="Search YouTube karaoke"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Karaoke
          </a>
        </div>
      )}
    </div>
  )
}
