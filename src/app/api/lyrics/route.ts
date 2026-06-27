import { NextRequest, NextResponse } from 'next/server'
import type { LyricsSource } from '@/types'

const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN

async function fetchGenius(title: string, artist: string): Promise<LyricsSource | null> {
  if (!GENIUS_TOKEN) return null

  const q = encodeURIComponent(`${title} ${artist}`.trim())
  const searchRes = await fetch(
    `https://api.genius.com/search?q=${q}&per_page=5`,
    { headers: { Authorization: `Bearer ${GENIUS_TOKEN}` } }
  )
  if (!searchRes.ok) return null
  const searchData = await searchRes.json()
  const hits: { result: { id: number; title: string; primary_artist: { name: string }; url: string } }[] =
    searchData.response?.hits ?? []
  if (!hits.length) return null

  const hit = hits[0].result
  // Genius doesn't expose full lyrics via API — return metadata + URL
  // The user can verify and we'll scrape the URL or let them paste.
  return {
    name: 'Genius',
    lyrics: '',
    credits: `${hit.title} · ${hit.primary_artist.name}`,
    url: hit.url,
    confidence: 90,
  }
}

async function fetchLrcLib(title: string, artist: string): Promise<LyricsSource | null> {
  const q = encodeURIComponent(`${title} ${artist}`.trim())
  const res = await fetch(`https://lrclib.net/api/search?q=${q}`, {
    headers: { 'Lrclib-Client': 'LyricsPWA/1.0' },
    next: { revalidate: 0 },
  })
  if (!res.ok) return null
  const results: {
    trackName: string
    artistName: string
    albumName?: string
    plainLyrics?: string
    syncedLyrics?: string
  }[] = await res.json()
  if (!results.length) return null

  const best = results[0]
  const raw = best.plainLyrics ?? ''
  if (!raw) return null

  return {
    name: 'LrcLib',
    lyrics: raw.trim(),
    credits: `${best.trackName} · ${best.artistName}`,
    ...(best.albumName ? { movie: best.albumName } : {}),
    confidence: 85,
  }
}

async function fetchOvhMusixmatch(title: string, artist: string): Promise<LyricsSource | null> {
  const q = encodeURIComponent(`${title} ${artist}`.trim())
  const res = await fetch(
    `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
  )
  if (!res.ok) return null
  const data: { lyrics?: string; error?: string } = await res.json()
  if (!data.lyrics) return null
  return {
    name: 'Lyrics.ovh',
    lyrics: data.lyrics.trim(),
    confidence: 80,
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') ?? ''
  const artist = searchParams.get('artist') ?? ''

  if (!title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }

  const [lrclib, ovh, genius] = await Promise.allSettled([
    fetchLrcLib(title, artist),
    fetchOvhMusixmatch(title, artist),
    fetchGenius(title, artist),
  ])

  const sources: LyricsSource[] = [
    lrclib.status === 'fulfilled' && lrclib.value ? lrclib.value : null,
    ovh.status === 'fulfilled' && ovh.value ? ovh.value : null,
    genius.status === 'fulfilled' && genius.value ? genius.value : null,
  ].filter((s): s is LyricsSource => s !== null && s.lyrics.length > 0)

  return NextResponse.json({ sources })
}
