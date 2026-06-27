'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import type { Song, Language } from '@/types'
import { LANGUAGE_LABELS } from '@/types'
import SongCard from '@/components/dashboard/SongCard'

export default function Dashboard() {
  const [songs, setSongs] = useState<Song[]>([])
  const [query, setQuery] = useState('')
  const [langFilter, setLangFilter] = useState<Language | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    db.songs.orderBy('updatedAt').reverse().toArray().then(s => {
      setSongs(s)
      setLoading(false)
    })
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this song?')) return
    await db.songs.delete(id)
    setSongs(s => s.filter(song => song.id !== id))
  }

  const handleExport = async () => {
    const all = await db.songs.toArray()
    // Strip device-specific id before exporting
    const data = all.map(({ id: _id, ...rest }) => rest)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lyrics-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported: Omit<Song, 'id'>[] = JSON.parse(await file.text())
      if (!Array.isArray(imported)) throw new Error()

      const existing = await db.songs.toArray()
      const existingKeys = new Set(
        existing.map(s => `${s.title.toLowerCase()}|${s.artist.toLowerCase()}`)
      )

      const now = Date.now()
      const toAdd = imported
        .filter(s => s.title && s.lyrics)
        .filter(s => !existingKeys.has(`${s.title.toLowerCase()}|${s.artist.toLowerCase()}`))
        .map(s => ({ ...s, createdAt: s.createdAt ?? now, updatedAt: s.updatedAt ?? now }))

      if (toAdd.length > 0) {
        await db.songs.bulkAdd(toAdd)
        const updated = await db.songs.orderBy('updatedAt').reverse().toArray()
        setSongs(updated)
      }

      const skipped = imported.length - toAdd.length
      showToast(
        toAdd.length > 0
          ? `Imported ${toAdd.length} song${toAdd.length !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} already existed` : ''}.`
          : `All ${skipped} song${skipped !== 1 ? 's' : ''} already exist — nothing added.`
      )
    } catch {
      showToast('Import failed — make sure the file is a valid lyrics backup.')
    }
    e.target.value = ''
  }

  const activeLangs = Array.from(new Set(songs.map(s => s.language))) as Language[]

  const filtered = songs.filter(s => {
    if (langFilter && s.language !== langFilter) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    return [s.title, s.artist, s.movie, s.musicDirector, s.lyricist, s.credits]
      .filter(Boolean).some(field => field!.toLowerCase().includes(q))
  })

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">My songs</h1>
            <p className="text-sm text-gray-400">{songs.length} {songs.length === 1 ? 'song' : 'songs'}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Export */}
            <button
              onClick={handleExport}
              disabled={songs.length === 0}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-30"
              title="Export songs to file"
              aria-label="Export songs"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
              </svg>
            </button>
            {/* Import */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Import songs from file"
              aria-label="Import songs"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12" />
              </svg>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImport}
            />
            <Link
              href="/songs/new"
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add song
            </Link>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm px-4 py-2.5 rounded-full shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-4 space-y-3">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search title, singer, movie, lyricist…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {activeLangs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setLangFilter(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                langFilter === null
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'
              }`}
            >
              All
            </button>
            {activeLangs.map(lang => (
              <button
                key={lang}
                onClick={() => setLangFilter(l => l === lang ? null : lang)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  langFilter === lang
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">
              {query || langFilter ? 'No songs match your filters' : 'No songs yet'}
            </p>
            {!query && !langFilter && (
              <Link href="/songs/new" className="text-sm text-violet-600 hover:text-violet-700 font-medium">
                Add your first song →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(song => (
              <SongCard key={song.id} song={song} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
