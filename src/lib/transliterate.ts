/**
 * Transliteration via Google Input Tools API (free, no key needed).
 *
 * Direction: Roman → native script (hi/ml/kn).
 * e.g. "tum hi ho" + hi → "तुम ही हो"
 */
import type { Language } from '@/types'

const GOOGLE_TRANSLITERATE_URL =
  'https://inputtools.google.com/request?text={TEXT}&itc={CODE}&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8'

const ITCODE: Record<Language, string | null> = {
  en: null,
  hi: 'hi-t-i0-und',
  ml: 'ml-t-i0-und',
  kn: 'kn-t-i0-und',
}

// Unicode ranges for each script
const SCRIPT_RANGES: Partial<Record<Language, RegExp>> = {
  hi: /[ऀ-ॿ]/,  // Devanagari
  ml: /[ഀ-ൿ]/,  // Malayalam
  kn: /[ಀ-೿]/,  // Kannada
}

/**
 * Returns 'native' if the text contains enough native-script characters,
 * 'roman' otherwise (mostly ASCII).
 */
export function detectScript(text: string, language: Language): 'native' | 'roman' {
  const range = SCRIPT_RANGES[language]
  if (!range) return 'roman'
  const sample = text.slice(0, 500)
  const nativeChars = (sample.match(new RegExp(range.source, 'g')) ?? []).length
  const totalChars = sample.replace(/\s/g, '').length
  return totalChars > 0 && nativeChars / totalChars > 0.15 ? 'native' : 'roman'
}

async function transliterateLine(text: string, itc: string): Promise<string> {
  if (!text.trim()) return text
  const url = GOOGLE_TRANSLITERATE_URL
    .replace('{TEXT}', encodeURIComponent(text))
    .replace('{CODE}', itc)
  const res = await fetch(url)
  if (!res.ok) return text
  const json = await res.json()
  // Response: ["SUCCESS", [["word", ["option1", "option2", ...]]]]
  try {
    const words: string[] = json[1].map((item: [string, string[]]) => item[1][0] ?? item[0])
    return words.join(' ')
  } catch {
    return text
  }
}

/**
 * Convert Roman lyrics → native script (hi/ml/kn).
 * Returns the input unchanged for English or if already native.
 */
export async function romanToNative(
  lyrics: string,
  language: Language
): Promise<string> {
  const itc = ITCODE[language]
  if (!itc) return lyrics

  const lines = lyrics.split('\n')
  const results = await Promise.all(
    lines.map(line =>
      line.trim()
        ? transliterateLine(line, itc).catch(() => line)
        : Promise.resolve(line)
    )
  )
  return results.join('\n')
}

/**
 * Legacy alias — kept for callers that use the old name.
 * @deprecated Use romanToNative directly.
 */
export const transliterateLyrics = romanToNative
