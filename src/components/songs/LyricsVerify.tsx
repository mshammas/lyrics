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
  const scriptType = src && language !== 'en' && language !== 'other'
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
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {sources.map((s, i) => (
          <button
            key={s.name}
            onClick={() => setActive(i)}
            className={`shrink-0 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active === i
                ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {s.name === 'Best match' ? (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Best match
              </span>
            ) : (
              <>
                {s.name}
                {s.confidence != null && (
                  <span className="ml-1 text-xs opacity-60">{s.confidence}%</span>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {src && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {(src.credits || src.movie || src.year) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 flex-1">
                {[src.credits, src.movie, src.year].filter(Boolean).join(' · ')}
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
