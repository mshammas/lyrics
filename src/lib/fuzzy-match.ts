/**
 * Fuzzy match a transcript snippet against a lyrics line.
 * Returns a score 0-1. Used by the STT engine to identify the current line.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '') // strip punctuation, keep unicode letters
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[m][n]
}

export function scoreMatch(transcript: string, line: string): number {
  const t = normalize(transcript)
  const l = normalize(line)
  if (!t || !l) return 0

  // Check if any word from transcript appears in the line (fast path)
  const tWords = t.split(' ')
  const lWords = new Set(l.split(' '))
  const wordHits = tWords.filter(w => w.length > 2 && lWords.has(w)).length
  const wordScore = wordHits / Math.max(tWords.length, 1)

  // Levenshtein on shorter of the two strings windowed
  const shorter = t.length < l.length ? t : l
  const longer = t.length < l.length ? l : t
  // Slide shorter over longer to find best position
  let bestEdit = shorter.length
  for (let i = 0; i <= longer.length - shorter.length; i++) {
    const window = longer.slice(i, i + shorter.length)
    const d = levenshtein(shorter, window)
    if (d < bestEdit) bestEdit = d
  }
  const editScore = 1 - bestEdit / Math.max(shorter.length, 1)

  return Math.max(wordScore, editScore)
}

/**
 * Given a rolling transcript and an array of upcoming lyric lines,
 * returns the index of the best matching line (or -1 if nothing is confident).
 */
export function findBestLine(
  transcript: string,
  lines: string[],
  minScore = 0.35
): number {
  let best = -1
  let bestScore = minScore
  for (let i = 0; i < lines.length; i++) {
    const s = scoreMatch(transcript, lines[i])
    if (s > bestScore) {
      bestScore = s
      best = i
    }
  }
  return best
}
