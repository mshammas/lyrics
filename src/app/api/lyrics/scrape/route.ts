import { NextRequest, NextResponse } from 'next/server'
import { load } from 'cheerio'

export interface ScrapeResult {
  lyrics: string
  title?: string
  artist?: string
  movie?: string
  year?: number
  musicDirector?: string
  lyricist?: string
}

// Ordered list of CSS selectors to try for lyrics content
const LYRIC_SELECTORS = [
  '[itemprop="lyrics"]',          // schema.org markup (hindigeetmala, etc.)
  '[itemprop*="lyric"]',
  '[class*="lyrics-content"]',
  '[class*="lyric-content"]',
  '[id*="lyrics-content"]',
  '[class*="song-lyrics"]',
  '[class*="song_lyrics"]',
  '[class*="songlyrics"]',
  '[class*="lyricbox"]',
  '[class*="lyrics_box"]',
  '.lyrics',
  '.lyric',
  '#lyrics',
  '#lyric',
  '[class*="lyrics"]',
  '[id*="lyrics"]',
  '.entry-content',    // WordPress sites
  '.post-content',
  '.td-post-content',
  '.single-content',
  'pre',
]

// Metadata label patterns — stop at newline, semicolon, pipe, or angle bracket
const SEP = '[^\\n\\r;|<·•]+'
const META_PATTERNS: { regex: RegExp; field: keyof ScrapeResult }[] = [
  { regex: new RegExp(`(?:singer|singers|sung\\s+by|vocals?)\\s*[:\\-]\\s*(${SEP})`, 'i'), field: 'artist' },
  { regex: new RegExp(`(?:music\\s+director|music\\s+by|music|composed\\s+by|composer)\\s*[:\\-]\\s*(${SEP})`, 'i'), field: 'musicDirector' },
  { regex: new RegExp(`(?:lyrics\\s+by|lyricist|penned\\s+by|written\\s+by)\\s*[:\\-]\\s*(${SEP})`, 'i'), field: 'lyricist' },
  { regex: new RegExp(`(?:movie|film|picture|album|from\\s+the\\s+(?:film|movie))\\s*[:\\-]\\s*(${SEP})`, 'i'), field: 'movie' },
  { regex: /(?:release\s+year|year)\s*[:\-]\s*(\d{4})/i, field: 'year' },
  { regex: /\b(19[3-9]\d|20[012]\d)\b/, field: 'year' },
]

function extractMeta(text: string): Partial<ScrapeResult> {
  const meta: Partial<ScrapeResult> = {}
  for (const { regex, field } of META_PATTERNS) {
    if (meta[field]) continue   // first match wins
    const m = text.match(regex)
    if (!m) continue
    const raw = m[1]?.trim().replace(/\s+/g, ' ')
    if (!raw) continue
    if (field === 'year') {
      const n = parseInt(raw)
      if (n >= 1930 && n <= new Date().getFullYear()) meta.year = n
    } else {
      // Drop common noise like trailing HTML-artefacts or overly long matches
      const clean = raw.replace(/[<>|·•]+.*$/, '').trim()
      if (clean && clean.length < 80) {
        (meta as Record<string, string>)[field] = clean
      }
    }
  }
  return meta
}

function extractLyrics(html: string): string | null {
  const $ = load(html)

  // Remove structural noise before searching
  $('script, style, noscript, nav, footer, header, aside, .ad, .ads, .advertisement, .sidebar, #sidebar, .comments, #comments, .navigation, .breadcrumb, .share, .social').remove()

  for (const sel of LYRIC_SELECTORS) {
    const el = $(sel).first()
    if (!el.length) continue

    // Preserve semantic line breaks before extracting text
    el.find('br').replaceWith('\n')
    el.find('p, div').each((_, node) => {
      const t = $(node).text().trim()
      if (t) $(node).after('\n')
    })

    const text = el
      .text()
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+\n/g, '\n')   // trailing spaces on lines
      .replace(/\n{3,}/g, '\n\n')   // collapse excess blank lines
      .trim()

    // Need at least a few lines to be considered lyrics
    if (text.length > 80 && text.split('\n').filter(l => l.trim()).length >= 3) {
      return text
    }
  }
  return null
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url parameter is required' }, { status: 400 })

  // Basic URL validation
  let parsed: URL
  try {
    parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,hi;q=0.8',
      },
      signal: AbortSignal.timeout(12_000),
      next: { revalidate: 0 },
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `The page returned HTTP ${res.status}. The site may require a login or block automated access.` },
        { status: 422 }
      )
    }
    html = await res.text()
  } catch (err) {
    const msg = err instanceof Error && err.name === 'TimeoutError'
      ? 'The page took too long to respond.'
      : 'Could not reach that URL. Check the link and try again.'
    return NextResponse.json({ error: msg }, { status: 422 })
  }

  const lyrics = extractLyrics(html)
  if (!lyrics) {
    return NextResponse.json(
      { error: 'Lyrics not found on this page. The site may use JavaScript rendering or an unsupported layout.' },
      { status: 422 }
    )
  }

  // Extract metadata from full page text (after noise removal)
  const $ = load(html)
  $('script, style').remove()
  const pageText = $('body').text()
  const meta = extractMeta(pageText)

  // Try og:title as a title hint
  const ogTitle = $('meta[property="og:title"]').attr('content')?.trim()
    || $('title').text().replace(/[-|·–].+$/, '').trim()  // strip site name suffix

  const result: ScrapeResult = {
    lyrics,
    ...(ogTitle ? { title: ogTitle } : {}),
    ...meta,
  }

  return NextResponse.json(result)
}
