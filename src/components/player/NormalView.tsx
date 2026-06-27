'use client'

import { useRef } from 'react'
import { usePinchZoom } from '@/lib/use-pinch-zoom'

interface Props {
  lines: string[]
  fontSize: number
  onFontChange: (n: number) => void
}

export default function NormalView({ lines, fontSize, onFontChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  usePinchZoom(containerRef, fontSize, onFontChange)

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-5 py-6 space-y-0.5"
      style={{ fontSize: `${fontSize}px`, lineHeight: 1.75 }}
    >
      {lines.map((line, i) =>
        line.trim() === '' ? (
          <div key={i} className="h-4" />
        ) : (
          <p key={i} className="text-gray-800 dark:text-gray-200 text-center">
            {line}
          </p>
        )
      )}
    </div>
  )
}
