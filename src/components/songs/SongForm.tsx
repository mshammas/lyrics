'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/lib/db'
import { detectScript, romanToNative } from '@/lib/transliterate'
import LyricsVerify from './LyricsVerify'
import SongPicker from './SongPicker'
import type { Song, Language, LyricsDisplay, LyricsSource } from '@/types'
import { LANGUAGE_LABELS } from '@/types'
import type { SongCandidate } from '@/app/api/songs/search/route'

const LANGUAGES: Language[] = ['en', 'hi', 'ml', 'kn']
const DISPLAY_OPTIONS: { value: LyricsDisplay; label: string }[] = [
  { value: 'original', label: 'Original script' },
  { value: 'transliteration', label: 'Transliteration (Roman)' },
  { value: 'both', label: 'Both' },
]

interface Props {
  song?: Song
}

export default function SongForm({ song }: Props) {
  const router = useRouter()
  const isEdit = !!song

  const [title, setTitle] = useState(song?.title ?? '')
  const [artist, setArtist] = useState(song?.artist ?? '')
  const [language, setLanguage] = useState<Language>(song?.language ?? 'hi')
  const [lyricsDisplay, setLyricsDisplay] = useState<LyricsDisplay>(song?.lyricsDisplay ?? 'original')
  const [lyrics, setLyrics] = useState(song?.lyrics ?? '')
  const [credits, setCredits] = useState(song?.credits ?? '')
  const [fetching, setFetching] = useState(false)
  const [candidates, setCandidates] = useState<SongCandidate[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [sources, setSources] = useState<LyricsSource[]>([])
  const [showVerify, setShowVerify] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingStep, setSavingStep] = useState('')
  const [error, setError] = useState('')

  const scriptType = lyrics.trim() && language !== 'en'
    ? detectScript(lyrics, language)
    : null

  const doFetchLyrics = useCallback(async (useTitle: string, useArtist: string) => {
    setFetching(true)
    setError('')
    try {
      const res = await fetch(
        `/api/lyrics?title=${encodeURIComponent(useTitle)}&artist=${encodeURIComponent(useArtist)}&language=${language}`
      )
      const data = await res.json()
      if (!data.sources?.length) {
        setError('No lyrics found. Try a different title or paste manually below.')
      } else {
        setSources(data.sources)
        setShowVerify(true)
      }
    } catch {
      setError('Failed to fetch lyrics. Check your connection.')
    } finally {
      setFetching(false)
    }
  }, [language])

  const fetchLyrics = useCallback(async () => {
    if (!title.trim()) { setError('Enter a song title first.'); return }
    setFetching(true)
    setError('')
    try {
      const res = await fetch(`/api/songs/search?title=${encodeURIComponent(title)}`)
      const data: { candidates: SongCandidate[] } = await res.json()

      // Filter to candidates whose title closely matches what the user typed
      const q = title.trim().toLowerCase()
      const matched = data.candidates.filter(
        c => c.title.toLowerCase() === q
      )

      if (matched.length > 1) {
        // Multiple different artists for the same title — ask the user to pick
        setCandidates(matched)
        setShowPicker(true)
        setFetching(false)
        return
      }
    } catch {
      // If the search step fails, fall through to lyrics fetch anyway
    }

    await doFetchLyrics(title, artist)
  }, [title, artist, doFetchLyrics])

  const handlePickerSelect = async (candidate: SongCandidate) => {
    setShowPicker(false)
    setCandidates([])
    setTitle(candidate.title)
    setArtist(candidate.artist)
    await doFetchLyrics(candidate.title, candidate.artist)
  }

  const handlePickerSkip = async () => {
    setShowPicker(false)
    setCandidates([])
    await doFetchLyrics(title, artist)
  }

  const handleVerifySelect = (source: LyricsSource) => {
    setLyrics(source.lyrics)
    if (source.credits) setCredits(source.credits)
    setShowVerify(false)
    setSources([])
  }

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return }
    if (!lyrics.trim()) { setError('Lyrics are required.'); return }
    setSaving(true)
    setError('')

    try {
      let finalLyrics = lyrics.trim()
      let lyricsRoman: string | undefined

      if (language !== 'en') {
        const script = detectScript(finalLyrics, language)

        if (script === 'roman') {
          // Fetched lyrics are in Roman (e.g. LrcLib for Hindi).
          // Store Roman as lyricsRoman and convert to native script as the primary.
          lyricsRoman = finalLyrics
          setSavingStep('Converting to native script…')
          const native = await romanToNative(finalLyrics, language).catch(() => null)
          if (native && native.trim()) {
            finalLyrics = native
          }
          // If conversion failed keep roman as both — still usable for STT
        } else {
          // Lyrics are already in native script.
          // Generate Roman transliteration for STT matching.
          setSavingStep('Generating transliteration…')
          // For native → roman we don't have a direct API yet,
          // so lyricsRoman stays undefined (STT will still work against native).
        }
      }

      setSavingStep('Saving…')
      const now = Date.now()
      if (isEdit && song.id != null) {
        await db.songs.update(song.id, {
          title: title.trim(),
          artist: artist.trim(),
          language,
          lyricsDisplay,
          lyrics: finalLyrics,
          lyricsRoman,
          credits: credits.trim(),
          updatedAt: now,
        })
        router.push(`/songs/${song.id}`)
      } else {
        const id = await db.songs.add({
          title: title.trim(),
          artist: artist.trim(),
          language,
          lyricsDisplay,
          lyrics: finalLyrics,
          lyricsRoman,
          credits: credits.trim(),
          createdAt: now,
          updatedAt: now,
        })
        router.push(`/songs/${id}`)
      }
    } catch {
      setError('Failed to save. Please try again.')
      setSaving(false)
      setSavingStep('')
    }
  }

  if (showPicker) {
    return (
      <SongPicker
        candidates={candidates}
        onPick={handlePickerSelect}
        onSkip={handlePickerSkip}
      />
    )
  }

  if (showVerify) {
    return (
      <LyricsVerify
        sources={sources}
        language={language}
        onSelect={handleVerifySelect}
        onCancel={() => setShowVerify(false)}
      />
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Song title *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Tum Hi Ho"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Artist</label>
        <input
          value={artist}
          onChange={e => setArtist(e.target.value)}
          placeholder="e.g. Arijit Singh"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                language === lang
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Show lyrics as</label>
        <div className="flex flex-wrap gap-2">
          {DISPLAY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLyricsDisplay(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                lyricsDisplay === opt.value
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-violet-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={fetchLyrics}
        disabled={fetching}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-medium transition-colors disabled:opacity-60"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        {fetching ? 'Searching…' : 'Fetch lyrics from internet'}
      </button>

      {/* Geetmanjusha hint for Hindi */}
      {language === 'hi' && (
        <p className="text-xs text-gray-400 dark:text-gray-500 -mt-2 text-center">
          For Devanagari lyrics, paste from{' '}
          <a
            href="https://geetmanjusha.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-500 hover:underline"
          >
            geetmanjusha.com
          </a>
          {' '}(requires free account) or any other source below.
        </p>
      )}

      <div className="relative">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700" /></div>
        <div className="relative flex justify-center"><span className="bg-gray-50 dark:bg-gray-900 px-3 text-sm text-gray-400">or paste manually</span></div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Lyrics</label>
          {scriptType && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              scriptType === 'native'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {scriptType === 'native' ? 'Native script detected' : 'Roman script — will auto-convert on save'}
            </span>
          )}
        </div>
        <textarea
          value={lyrics}
          onChange={e => setLyrics(e.target.value)}
          placeholder={"One line per lyric line.\nBlank lines are treated as section breaks.\n\nFor Hindi, paste in Devanagari (हिंदी) or Roman — both work."}
          rows={12}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-y"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Credits</label>
        <input
          value={credits}
          onChange={e => setCredits(e.target.value)}
          placeholder="e.g. Music: Mithoon · Lyrics: Mithoon · Film: Aashiqui 2"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-60"
        >
          {saving ? (savingStep || 'Saving…') : isEdit ? 'Save changes' : 'Add song'}
        </button>
      </div>
    </div>
  )
}
