import { NextRequest, NextResponse } from 'next/server'

export interface SongCandidate {
  id: number
  title: string
  artist: string
  album: string
  year?: number
  artwork?: string
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title')?.trim() ?? ''

  if (!title) {
    return NextResponse.json({ candidates: [] })
  }

  try {
    const url =
      `https://itunes.apple.com/search?` +
      `term=${encodeURIComponent(title)}&entity=song&limit=25&media=music`

    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return NextResponse.json({ candidates: [] })

    const data: {
      results: {
        trackId: number
        trackName: string
        artistName: string
        collectionName: string
        releaseDate?: string
        artworkUrl100?: string
      }[]
    } = await res.json()

    // Keep only results whose track name matches the query (case-insensitive)
    const q = title.toLowerCase()
    const seen = new Set<string>()
    const candidates: SongCandidate[] = []

    for (const r of data.results) {
      if (!r.trackName.toLowerCase().includes(q)) continue
      // Deduplicate by artist+title
      const key = `${r.artistName.toLowerCase()}|${r.trackName.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      const releaseYear = r.releaseDate ? new Date(r.releaseDate).getFullYear() : undefined
      candidates.push({
        id: r.trackId,
        title: r.trackName,
        artist: r.artistName,
        album: r.collectionName,
        year: releaseYear && releaseYear >= 1930 ? releaseYear : undefined,
        artwork: r.artworkUrl100,
      })
    }

    return NextResponse.json({ candidates })
  } catch {
    return NextResponse.json({ candidates: [] })
  }
}
