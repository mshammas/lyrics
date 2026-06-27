'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import type { Song } from '@/types'
import SongForm from '@/components/songs/SongForm'

export default function EditSongPage() {
  const { id } = useParams<{ id: string }>()
  const [song, setSong] = useState<Song | null | undefined>(undefined)

  useEffect(() => {
    db.songs.get(parseInt(id)).then(s => setSong(s ?? null))
  }, [id])

  if (song === undefined) {
    return (
      <div className="flex items-center justify-center min-h-dvh text-gray-400 text-sm">
        Loading…
      </div>
    )
  }

  if (song === null) return notFound()

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-4">
        <div className="max-w-xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit song</h1>
        </div>
      </header>
      <SongForm song={song} />
    </div>
  )
}
