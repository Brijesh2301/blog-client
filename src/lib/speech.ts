'use client'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * WEB SPEECH CONTROLLER
 * ═════════════════════════════════════════════════════════════════════════════
 * The free tier of the Listen feature: the browser reads the article aloud,
 * at no cost and with no server involved.
 *
 * The text is spoken CHUNK BY CHUNK rather than as one long utterance. That is
 * not a stylistic choice — it is the only way to make this reliable:
 *
 *  - Chrome silently truncates utterances beyond roughly 32KB, so a long
 *    article simply stops partway through.
 *  - `onboundary` events, the obvious way to track progress, are unreliable
 *    across engines and absent entirely in some. Counting completed chunks
 *    gives accurate progress everywhere.
 *  - Seeking, resuming and the ±15s skips all become index arithmetic rather
 *    than character offsets into a stream we cannot address.
 *
 * Chrome also pauses synthesis after ~15 seconds of a single utterance unless
 * it is nudged; short chunks sidestep that bug too.
 */

export type SpeechChunk = {
  index: number
  text: string
  /** Estimated seconds, used for the progress bar and the time display. */
  seconds: number
}

/** Spoken words per minute at 1x. Matches the server's estimate. */
const SPOKEN_WPM = 150

/** Target chunk length. Short enough to stay well inside engine limits. */
const TARGET_CHARS = 240

/**
 * Splits text into sentence-aligned chunks.
 *
 * Breaking mid-sentence makes the synthesiser drop its intonation and sound
 * robotic at every seam, so chunks only ever end at sentence boundaries —
 * unless a single "sentence" is pathologically long, which is then split on
 * whitespace as a fallback.
 */
export function chunkText(text: string): SpeechChunk[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []

  // Split after . ! ? followed by whitespace, keeping the punctuation.
  const sentences = clean.match(/[^.!?]+[.!?]+|\S[^.!?]*$/g) ?? [clean]

  const chunks: string[] = []
  let current = ''

  for (const raw of sentences) {
    const sentence = raw.trim()
    if (!sentence) continue

    if (sentence.length > TARGET_CHARS * 2) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      // Hard-split an over-long sentence on word boundaries.
      const words = sentence.split(' ')
      let piece = ''
      for (const word of words) {
        if ((piece + ' ' + word).trim().length > TARGET_CHARS) {
          chunks.push(piece.trim())
          piece = word
        } else {
          piece = `${piece} ${word}`.trim()
        }
      }
      if (piece) chunks.push(piece.trim())
      continue
    }

    if ((current + ' ' + sentence).trim().length > TARGET_CHARS) {
      if (current) chunks.push(current.trim())
      current = sentence
    } else {
      current = `${current} ${sentence}`.trim()
    }
  }

  if (current.trim()) chunks.push(current.trim())

  return chunks.map((text, index) => ({
    index,
    text,
    seconds: Math.max(1, (text.split(/\s+/).filter(Boolean).length / SPOKEN_WPM) * 60),
  }))
}

/** True when this browser can speak at all. */
export function speechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof window.SpeechSynthesisUtterance === 'function'
  )
}

/**
 * Loads the voice list.
 *
 * `getVoices()` is asynchronous in every browser but returns synchronously —
 * on a cold page it returns an empty array and fills in later, signalled by
 * `voiceschanged`. Calling it once and trusting the result is the single most
 * common Web Speech bug.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (!speechSupported()) {
      resolve([])
      return
    }

    const immediate = window.speechSynthesis.getVoices()
    if (immediate.length > 0) {
      resolve(immediate)
      return
    }

    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.speechSynthesis.removeEventListener('voiceschanged', finish)
      resolve(window.speechSynthesis.getVoices())
    }

    window.speechSynthesis.addEventListener('voiceschanged', finish)
    // Some engines never fire the event; do not hang the UI waiting.
    setTimeout(finish, 1500)
  })
}

/** Preferred English voices first — the article language. */
export function rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aEn = a.lang.toLowerCase().startsWith('en') ? 0 : 1
    const bEn = b.lang.toLowerCase().startsWith('en') ? 0 : 1
    if (aEn !== bEn) return aEn - bEn
    // Local voices start instantly; remote ones need a network round trip.
    if (a.localService !== b.localService) return a.localService ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Per-post playback preferences, remembered across visits. */
export type SpeechPrefs = { rate: number; voiceURI: string | null; chunkIndex: number }

const PREFS_KEY = 'devlume-listen'

export function loadPrefs(slug: string): SpeechPrefs {
  const fallback: SpeechPrefs = { rate: 1, voiceURI: null, chunkIndex: 0 }
  try {
    const raw = localStorage.getItem(`${PREFS_KEY}:${slug}`)
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return fallback
    const value = parsed as Partial<SpeechPrefs>
    return {
      rate: typeof value.rate === 'number' ? value.rate : 1,
      voiceURI: typeof value.voiceURI === 'string' ? value.voiceURI : null,
      chunkIndex: typeof value.chunkIndex === 'number' ? value.chunkIndex : 0,
    }
  } catch {
    // Private mode, blocked storage, or corrupt JSON. Defaults are fine.
    return fallback
  }
}

export function savePrefs(slug: string, prefs: Partial<SpeechPrefs>): void {
  try {
    const next = { ...loadPrefs(slug), ...prefs }
    localStorage.setItem(`${PREFS_KEY}:${slug}`, JSON.stringify(next))
  } catch {
    // Never let a storage failure break playback.
  }
}
