'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import type { Song } from '@/types'
import PlayerShell from '@/components/player/PlayerShell'

export default function PlayerPage() {
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

  return <PlayerShell song={song} />
}
