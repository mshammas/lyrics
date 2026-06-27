'use client'

import type { SongCandidate } from '@/app/api/songs/search/route'

interface Props {
  candidates: SongCandidate[]
  onPick: (candidate: SongCandidate) => void
  onSkip: () => void
}

export default function SongPicker({ candidates, onPick, onSkip }: Props) {
  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Which song?
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Multiple songs share this title. Pick the right one so we fetch the correct lyrics.
        </p>
      </div>

      <ul className="space-y-2">
        {candidates.map(c => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onPick(c)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors text-left group"
            >
              {c.artwork ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.artwork}
                  alt=""
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-violet-700 dark:group-hover:text-violet-300">
                  {c.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{c.artist}</p>
                {c.album && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.album}</p>
                )}
              </div>
              <svg
                className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 shrink-0"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onSkip}
        className="w-full py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        None of these — search anyway
      </button>
    </div>
  )
}
