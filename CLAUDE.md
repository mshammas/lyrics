@AGENTS.md

# Lyrics PWA — Project Bible

> **Self-update rule:** Whenever you make a meaningful change to this project (new feature, architectural decision, deployment change, discovered gotcha), update the relevant section of this file and commit it. Future sessions rely on this file as their sole source of truth.

---

## Purpose

A PWA for **singers** performing live (stage, harmonium players, vocalists). Lets them follow song lyrics hands-free. Two modes:

- **Normal mode** — scrollable, pinch-to-zoom page. Singer reads at their own pace.
- **Auto mode** — uses the device microphone (Web Speech API) to listen and auto-scroll to the current line. Tap anywhere to manually advance. A "Tap to advance" nudge appears after 10 s of no STT match.

---

## Live URLs

| | URL |
|---|---|
| Production | https://lyrics-phi-three.vercel.app/ |
| GitHub repo | https://github.com/mshammas/lyrics |

**Deploy:** Push to `main` → Vercel auto-deploys. No manual steps needed.

---

## Git / SSH setup

The machine has two GitHub accounts. The remote uses a named SSH host alias:

```
git remote = git@github-mshammas:mshammas/lyrics.git
```

`~/.ssh/config` has:
```
Host github-mshammas
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_mshammas
  IdentitiesOnly yes
```

**Never change the remote URL to `git@github.com:...`** — that picks up the wrong account (`ichummas`).

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | |
| Language | TypeScript | |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) | |
| PWA | `@ducanh2912/next-pwa` v10 | `next-pwa` v5 is incompatible with Next 16 — do NOT switch back |
| Offline DB | Dexie.js (IndexedDB) | Songs stored on-device, no backend needed |
| STT | Web Speech API (browser built-in) | No API key, works on iOS/Android/Chrome |
| Transliteration | Google Input Tools API | Free, no key needed. Direction: Roman → native script |
| Fuzzy match | Custom (word-hit + Levenshtein sliding window) | Handles music bleed-in and mic noise |
| HTML parsing | `cheerio` | Installed for potential scraping use |
| Icon generation | `sharp` | Generates PNG icons from SVG at build time |
| Lyrics sources | LrcLib, Lyrics.ovh, Genius (optional) | Genius needs `GENIUS_ACCESS_TOKEN` in `.env.local` |
| Song search | iTunes Search API (via `/api/songs/search`) | Free, no key, used for title disambiguation |

---

## Key architectural decisions

### Song storage
All songs are stored in **IndexedDB via Dexie** — no server, no account needed. The `db` singleton is in `src/lib/db.ts`. Schema: `songs` table with `++id, title, artist, language, createdAt, updatedAt`.

### Two-mode player
Normal and Auto modes share the same `PlayerShell` component. Auto mode is toggled by a `Toggle` switch in the header. When Auto is off it's a plain scrollable page. **Never add STT or auto-advance logic to Normal mode.**

### STT fuzzy matching
`src/lib/fuzzy-match.ts` — `scoreMatch(transcript, line)` returns the max of:
- Word-hit score (fraction of transcript words found in the line)
- Sliding-window Levenshtein score (best alignment across substrings)

`findBestLine()` searches a 4-line lookahead window from `currentIndex`. Min score threshold: `0.35`. This tolerates music bleed-in because the background music doesn't match lyric structure.

### Hindi / Devanagari handling
LrcLib and Lyrics.ovh return **Roman transliterations** for Hindi songs (e.g. "Tum hi ho"), not Devanagari. The fix:
- `detectScript(text, language)` in `src/lib/transliterate.ts` checks what fraction of characters fall in the target Unicode range (Devanagari: `U+0900–U+097F`)
- On save, if Roman lyrics + Hindi language: store Roman as `lyricsRoman`, call `romanToNative()` to generate Devanagari via Google Input Tools, store that as `lyrics`
- Google Input Tools (`hi-t-i0-und`) converts Roman phonetic input → Devanagari. Direction: `"tum hi ho"` → `"तुम ही हो"`
- **geetmanjusha.com requires login** — cannot be scraped. UI shows a hint to paste manually.

### Song title disambiguation
Before fetching lyrics, `SongForm` calls `/api/songs/search?title=...` which queries iTunes. If multiple songs share the exact same title (different artists), `SongPicker` shows a disambiguation list. User picks one → artist auto-filled → lyrics fetch proceeds. "None of these — search anyway" skips picker.

### Font size persistence
Per-song font size stored in `localStorage` with key `lyrics_font_<songId>`. Initialized in `useState` lazy initializer (SSR-safe `typeof window` guard). Range: 14–32 px, default 20 px.

### Landscape support
Tailwind `landscape:` variants hide non-essential UI (artist subtitle, STT status bar, credits bar) in landscape to maximise lyric space. Never remove these classes.

### Active line positioning
In Auto mode the active line is scrolled to **28% from the top** (portrait) or **22%** (landscape) so the singer sees plenty of upcoming lines below.

---

## File map

```
src/
  app/
    page.tsx                    — Dashboard (loads songs from Dexie, client component)
    layout.tsx                  — Root layout, PWA metadata, Geist font
    globals.css                 — @import "tailwindcss", tap highlight suppression
    api/
      lyrics/route.ts           — GET /api/lyrics?title&artist&language → { sources[] }
      songs/search/route.ts     — GET /api/songs/search?title → { candidates[] } (iTunes)
    songs/
      new/page.tsx              — Add song page
      [id]/page.tsx             — Player page
      [id]/edit/page.tsx        — Edit song page

  components/
    dashboard/SongCard.tsx      — Song card with language badge, player/edit/delete links
    player/
      PlayerShell.tsx           — Main player: mode toggle, font panel, STT control, header
      AutoView.tsx              — Auto-mode lyrics with opacity/scale gradient + stall nudge
      NormalView.tsx            — Simple scrollable lyrics list
    songs/
      SongForm.tsx              — Add/edit form: disambiguation → verify → save with script conversion
      LyricsVerify.tsx          — Source picker tabs with script-type badge
      SongPicker.tsx            — iTunes disambiguation picker
    ui/
      Toggle.tsx                — Accessible toggle switch

  lib/
    db.ts                       — Dexie schema and singleton
    fuzzy-match.ts              — STT scoring: normalize, levenshtein, scoreMatch, findBestLine
    stt.ts                      — STT engine: continuous mode, rolling buffer, stall timer, auto-restart
    transliterate.ts            — detectScript, romanToNative (Google Input Tools), legacy alias

  types/index.ts                — Song, Language, LyricsDisplay, LyricsSource, LANGUAGE_BCP47

public/
  manifest.json                 — PWA manifest, orientation: "any", theme: #7c3aed
  icons/icon-192.png            — Generated by scripts/generate-icons.mjs
  icons/icon-512.png
  apple-touch-icon.png

scripts/
  generate-icons.mjs            — Music note SVG → sharp → PNG icons (run once)

next.config.ts                  — withPWA wrapper, turbopack: {} (required — see gotchas)
```

---

## Type definitions

```typescript
type Language = 'en' | 'hi' | 'ml' | 'kn'
type LyricsDisplay = 'original' | 'transliteration' | 'both'

interface Song {
  id?: number
  title: string
  artist: string
  language: Language
  lyricsDisplay: LyricsDisplay
  lyrics: string          // native script (Devanagari for Hindi, etc.)
  lyricsRoman?: string    // Roman transliteration (for STT matching + display toggle)
  credits?: string
  source?: string
  createdAt: number
  updatedAt: number
}

interface LyricsSource {
  name: string; lyrics: string; credits?: string; url?: string; confidence?: number
}

interface SongCandidate {           // from /api/songs/search
  id: number; title: string; artist: string; album: string; artwork?: string
}

const LANGUAGE_BCP47 = { en: 'en-IN', hi: 'hi-IN', ml: 'ml-IN', kn: 'kn-IN' }
```

---

## Development commands

```bash
npm run dev       # Start dev server (Turbopack) — PWA disabled in dev
npm run build     # Production build
npm run lint      # ESLint check
npx tsc --noEmit  # TypeScript check (run before committing)
node scripts/generate-icons.mjs  # Regenerate PWA icons (only if icon SVG changes)
```

---

## Known gotchas

1. **`next-pwa` v5** is incompatible with Next 16 — it's been replaced with `@ducanh2912/next-pwa` v10. Do not reinstall `next-pwa`.

2. **`turbopack: {}` in `next.config.ts`** is required — `@ducanh2912/next-pwa` injects webpack config, and Next 16 errors if `turbopack` key is absent.

3. **`SpeechRecognition` TypeScript types** — not in the DOM lib for this TS version. All interfaces (`SpeechRecognitionInstance`, `SpeechRecognitionCtor`, etc.) are defined inline in `src/lib/stt.ts`. Don't add `@types/dom-speech-recognition` without testing compatibility.

4. **PWA is disabled in development** (`disable: process.env.NODE_ENV === 'development'`). To test service worker, run `npm run build && npm run start`.

5. **Google Input Tools API** is a public endpoint (`inputtools.google.com`) with no auth. It is called client-side. Do not move it server-side — it needs browser context for the `fetch` and the user's language preference.

6. **`resetStallTimer` must be declared before `advanceLine`** in `PlayerShell.tsx` — `advanceLine` references it, and `const` declarations in the same scope aren't hoisted.

7. **PWA manifest icon `purpose`** must be split into separate entries (`"any"` and `"maskable"`) — a single `"any maskable"` string fails validation on some platforms.

---

## Environment variables

```bash
# .env.local (not committed)
GENIUS_ACCESS_TOKEN=   # Optional — enables Genius as a lyrics source
```

No other env vars required. All other APIs are keyless.

---

## Feature checklist

- [x] Dashboard with song cards
- [x] Add / edit / delete songs
- [x] Multi-language: English, Hindi, Malayalam, Kannada
- [x] Auto-fetch lyrics (LrcLib, Lyrics.ovh, Genius)
- [x] Song title disambiguation via iTunes
- [x] Script detection: Devanagari vs Roman, auto-convert on save
- [x] Transliteration toggle in player (अ→A / A→अ)
- [x] Normal player mode (scroll + pinch-to-zoom)
- [x] Auto player mode (STT-driven, continuous)
- [x] Tap-to-advance + stall nudge (10 s)
- [x] Font size slider, persisted per song in localStorage
- [x] Portrait + landscape layout
- [x] YouTube karaoke search link in player footer
- [x] PWA manifest + icons (installable)
- [ ] Devanagari → Roman romanization (native script → lyricsRoman for STT)
- [ ] Offline lyrics caching via service worker
