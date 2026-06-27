export type Language = 'en' | 'hi' | 'ml' | 'kn'

export type LyricsDisplay = 'original' | 'transliteration' | 'both'

export interface Song {
  id?: number
  title: string
  artist: string
  language: Language
  lyricsDisplay: LyricsDisplay
  lyrics: string          // line-separated original lyrics
  lyricsRoman?: string    // transliterated version (cached)
  credits?: string
  source?: string         // which source was chosen
  createdAt: number
  updatedAt: number
}

export interface LyricsSource {
  name: string
  lyrics: string
  credits?: string
  url?: string
  confidence?: number     // 0-100 match quality indicator
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  ml: 'Malayalam',
  kn: 'Kannada',
}

export const LANGUAGE_BCP47: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  ml: 'ml-IN',
  kn: 'kn-IN',
}

export const LANGUAGE_BADGE: Record<Language, string> = {
  en: 'EN',
  hi: 'HI',
  ml: 'ML',
  kn: 'KN',
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
}

export function songPath(id: number, title: string): string {
  return `/songs/${id}-${slugify(title)}`
}
