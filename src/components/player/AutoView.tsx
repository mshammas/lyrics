'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePinchZoom } from '@/lib/use-pinch-zoom'

interface Props {
  lines: string[]
  activeIndex: number
  fontSize: number
  onFontChange: (n: number) => void
  onTap: () => void
  onLineSelect: (index: number) => void
  showStallNudge: boolean
}

function getOpacity(delta: number): string {
  if (delta <= -2) return 'text-white/15'
  if (delta === -1) return 'text-white/35'
  if (delta === 0) return 'text-white'
  if (delta === 1) return 'text-white/65'
  if (delta === 2) return 'text-white/45'
  if (delta === 3) return 'text-white/28'
  if (delta === 4) return 'text-white/14'
  return 'text-white/[0.06]'
}

function getFontScale(delta: number): number {
  if (delta === 0) return 1.1
  if (delta === -1 || delta === 1) return 1.0
  return 0.93
}

export default function AutoView({ lines, activeIndex, fontSize, onFontChange, onTap, onLineSelect, showStallNudge }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const isPinchingRef = usePinchZoom(containerRef, fontSize, onFontChange)

  useEffect(() => {
    const container = containerRef.current
    const active = activeRef.current
    if (!container || !active) return

    const isLandscape = window.matchMedia('(orientation: landscape)').matches
    const targetFraction = isLandscape ? 0.22 : 0.28

    const containerTop = container.getBoundingClientRect().top
    const activeTop = active.getBoundingClientRect().top
    const targetOffset = container.clientHeight * targetFraction
    const scrollDelta = activeTop - containerTop - targetOffset
    container.scrollBy({ top: scrollDelta, behavior: 'smooth' })
  }, [activeIndex])

  const handleTap = useCallback(() => {
    if (!isPinchingRef.current) onTap()
  }, [onTap, isPinchingRef])

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-hidden relative select-none"
      onClick={handleTap}
      role="button"
      tabIndex={0}
      aria-label="Tap to advance to next line"
      onKeyDown={e => {
        if (e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault()
          handleTap()
        }
      }}
    >
      {/* Top fade */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-12 z-10"
        style={{ background: 'linear-gradient(to bottom, #0d0d14, transparent)' }}
      />

      <div className="py-6 space-y-0.5">
        {lines.map((line, i) => {
          const delta = i - activeIndex
          const isActive = delta === 0
          return (
            <div
              key={i}
              ref={isActive ? activeRef : undefined}
              className={`px-5 py-1 rounded-sm transition-all duration-300 text-center ${getOpacity(delta)} ${
                isActive ? 'bg-white/[0.06] font-semibold' : ''
              }`}
              style={{
                fontSize: `${fontSize * getFontScale(delta)}px`,
                lineHeight: 1.65,
              }}
              onClick={(e) => {
                e.stopPropagation()
                if (!isPinchingRef.current) onLineSelect(i)
              }}
            >
              {line || ' '}
            </div>
          )
        })}
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 z-10"
        style={{ background: 'linear-gradient(to top, #0d0d14, transparent)' }}
      />

      {/* Stall nudge */}
      {showStallNudge && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 animate-bounce">
          <div className="flex items-center gap-2 bg-violet-600/80 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full shadow-lg">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Tap to advance
          </div>
        </div>
      )}
    </div>
  )
}
