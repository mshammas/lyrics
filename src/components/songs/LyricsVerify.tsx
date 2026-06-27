'use client'

import { useState } from 'react'
import { detectScript } from '@/lib/transliterate'
import type { LyricsSource, Language } from '@/types'

interface Props {
  sources: LyricsSource[]
  language: Language
  onSelect: (source: LyricsSource) => void
  onCancel: () => void
}

export default function LyricsVerify({ sources, language, onSelect, onCancel }: Props) {
  const [active, setActive] = useState(0)

  const src = sources[active]
  const scriptType = src && language !== 'en'
    ? detectScript(src.lyrics, language)
    : null

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Verify lyrics</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Found {sources.length} {sources.length === 1 ? 'source' : 'sources'}. Review and pick the best one.
        </p>
      </div>

      {/* Source tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {sources.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActive(i)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === i
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {s.name}
            {s.confidence != null && (
              <span className="ml-1 text-xs opacity-60">{s.confidence}%</span>
            )}
          </button>
        ))}
      </div>

      {src && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {src.credits && (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 flex-1">
                {src.credits}
              </p>
            )}
            {scriptType && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                scriptType === 'native'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {scriptType === 'native' ? 'Native script' : 'Roman — will auto-convert'}
              </span>
            )}
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
              {src.lyrics}
            </pre>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => src && onSelect(src)}
          className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors"
        >
          Use this source
        </button>
      </div>
    </div>
  )
}
