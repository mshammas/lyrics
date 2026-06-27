'use client'

import Link from 'next/link'
import type { Song } from '@/types'
import { LANGUAGE_BADGE, songPath } from '@/types'

const LANG_COLORS: Record<string, string> = {
  en: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  hi: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ml: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  kn: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}

interface Props {
  song: Song
  onDelete?: (id: number) => void
}

export default function SongCard({ song, onDelete }: Props) {
  const lineCount = song.lyrics.split('\n').filter(l => l.trim()).length
  return (
    <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <Link href={songPath(song.id!, song.title)} className="block">
          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{song.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {song.artist || 'Unknown artist'} · {lineCount} lines
          </p>
        </Link>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${LANG_COLORS[song.language]}`}>
        {LANGUAGE_BADGE[song.language]}
      </span>
      <Link
        href={`${songPath(song.id!, song.title)}/edit`}
        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Edit song"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </Link>
      {onDelete && song.id != null && (
        <button
          onClick={() => onDelete(song.id!)}
          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          aria-label="Delete song"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      )}
      <Link
        href={songPath(song.id!, song.title)}
        className="p-1.5 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
        aria-label="Open player"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </Link>
    </div>
  )
}
