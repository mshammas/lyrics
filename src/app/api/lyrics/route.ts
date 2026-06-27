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
    releaseDate?: string
    plainLyrics?: string
    syncedLyrics?: string
  }[] = await res.json()
  if (!results.length) return null

  const best = results[0]
  const raw = best.plainLyrics ?? ''
  if (!raw) return null

  const year = best.releaseDate ? parseInt(best.releaseDate.slice(0, 4)) || undefined : undefined

  return {
    name: 'LrcLib',
    lyrics: raw.trim(),
    credits: `${best.trackName} · ${best.artistName}`,
    ...(best.albumName ? { movie: best.albumName } : {}),
    ...(year ? { year } : {}),
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

function buildBestMatch(sources: LyricsSource[]): LyricsSource | null {
  if (sources.length < 2) return null

  // Prefer higher confidence, then longer lyrics as tiebreaker
  const ranked = [...sources].sort((a, b) => {
    const c = (b.confidence ?? 0) - (a.confidence ?? 0)
    return c !== 0 ? c : b.lyrics.length - a.lyrics.length
  })

  const best = ranked[0]

  // Merge best available metadata from all sources
  const movie = sources.find(s => s.movie)?.movie
  const year = sources.find(s => s.year)?.year
  const credits = sources.find(s => s.credits)?.credits

  // Skip the merged entry if it's identical to the best source
  const unchanged =
    movie === best.movie && year === best.year && credits === best.credits
  if (unchanged) return null

  return {
    name: 'Best match',
    lyrics: best.lyrics,
    credits: credits ?? best.credits,
    movie: movie ?? best.movie,
    year: year ?? best.year,
    confidence: best.confidence,
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

  const individual: LyricsSource[] = [
    lrclib.status === 'fulfilled' && lrclib.value ? lrclib.value : null,
    ovh.status === 'fulfilled' && ovh.value ? ovh.value : null,
    genius.status === 'fulfilled' && genius.value ? genius.value : null,
  ].filter((s): s is LyricsSource => s !== null && s.lyrics.length > 0)

  const merged = buildBestMatch(individual)
  const sources = merged ? [merged, ...individual] : individual

  return NextResponse.json({ sources })
}
