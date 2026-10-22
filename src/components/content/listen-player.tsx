'use client'

import { Headphones, Pause, Play, RotateCcw, RotateCw, Square, X } from 'lucide-react'
import * as React from 'react'

import type { SpeechPayload } from '@/lib/public-api'
import { cn } from '@/lib/utils'
import {
  chunkText,
  formatTime,
  loadPrefs,
  loadVoices,
  rankVoices,
  savePrefs,
  speechSupported,
} from '@/lib/speech'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * LISTEN PLAYER
 * ═════════════════════════════════════════════════════════════════════════════
 * Progressive enhancement, start to finish:
 *
 *  - The full article text is in the server-rendered HTML. This component adds
 *    a way to HEAR it; it never replaces or hides the text, so disabling JS
 *    costs the reader nothing but the audio.
 *  - It is dynamically imported, so none of this ships until the reader asks
 *    for it.
 *  - The mini-player is `fixed`, outside the document flow, so appearing and
 *    disappearing cannot move the article a single pixel. CLS stays zero.
 *  - It never autoplays. Browsers block it anyway, and a page that starts
 *    talking is hostile.
 *
 * TWO TRANSPORTS, one chrome. A pre-generated MP3 plays through an Audio
 * element with real seeking and a real duration; without one, the browser's
 * own synthesiser reads the text for free. The reader gets the same controls
 * either way, which is why the chrome lives in `Shell` and `Transport` while
 * each transport supplies only behaviour.
 */

const SKIP_SECONDS = 15
const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const

export function ListenPlayer({
  slug,
  title,
  payload,
  onClose,
}: {
  slug: string
  title: string
  payload: SpeechPayload
  onClose: () => void
}) {
  // Premium audio when it exists, the browser's voice otherwise. Decided once,
  // from the payload, so the player never switches transport mid-listen.
  return payload.audioUrl ? (
    <AudioTransport
      src={payload.audioUrl}
      title={title}
      slug={slug}
      fallbackSeconds={payload.estimatedSeconds}
      onClose={onClose}
    />
  ) : (
    <SpeechTransport
      slug={slug}
      title={title}
      text={payload.text}
      estimatedSeconds={payload.estimatedSeconds}
      onClose={onClose}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   MP3 TRANSPORT — the premium tier
   ═══════════════════════════════════════════════════════════════════════════ */

function AudioTransport({
  src,
  title,
  slug,
  fallbackSeconds,
  onClose,
}: {
  src: string
  title: string
  slug: string
  fallbackSeconds: number
  onClose: () => void
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = React.useState(false)
  const [elapsed, setElapsed] = React.useState(0)
  const [duration, setDuration] = React.useState(fallbackSeconds)
  /*
   * Saved preferences are read in a LAZY INITIALISER, not an effect.
   *
   * This player is `dynamic({ ssr: false })`, so it only ever renders in the
   * browser and localStorage is safe to touch here. Loading prefs in an
   * effect instead would render one frame at the default rate and then
   * replace it — a visible flicker on the control the reader just used.
   */
  const [rate, setRate] = React.useState(() => loadPrefs(slug).rate)

  /*
   * Constructed imperatively rather than rendered as <audio>.
   *
   * There is no visible media element — our own transport replaces the native
   * controls — and `timeupdate` fires several times a second, which has no
   * business going through the render path as a prop.
   *
   * `preload="metadata"` matters for the performance gate: pressing Listen
   * fetches a few kilobytes of headers, not the whole MP3.
   */
  React.useEffect(() => {
    const audio = new Audio(src)
    audio.preload = 'metadata'

    const prefs = loadPrefs(slug)
    audio.playbackRate = prefs.rate
    audioRef.current = audio

    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
      // Resume where this reader stopped — but not within a few seconds of
      // the end, where "resuming" means immediately finishing.
      if (prefs.chunkIndex > 0 && prefs.chunkIndex < audio.duration - 5) {
        audio.currentTime = prefs.chunkIndex
        setElapsed(prefs.chunkIndex)
      }
    }
    const onTime = () => setElapsed(audio.currentTime)
    const onEnd = () => {
      setPlaying(false)
      savePrefs(slug, { chunkIndex: 0 })
    }

    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.pause()
      // Drop the source so the browser releases the buffered file instead of
      // holding an abandoned download in memory.
      audio.src = ''
      audioRef.current = null
    }
  }, [src, slug])

  // Checkpointed on a timer rather than on every `timeupdate`, which fires
  // roughly four times a second and would hammer localStorage.
  React.useEffect(() => {
    const id = window.setInterval(() => {
      const audio = audioRef.current
      if (audio && !audio.paused) {
        savePrefs(slug, { chunkIndex: Math.floor(audio.currentTime) })
      }
    }, 5000)
    return () => window.clearInterval(id)
  }, [slug])

  const toggle = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      // `play()` rejects when the browser blocks playback; swallowing it would
      // leave the button showing "pause" over silence.
      void audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false))
    } else {
      audio.pause()
      setPlaying(false)
      savePrefs(slug, { chunkIndex: Math.floor(audio.currentTime) })
    }
  }, [slug])

  const seekTo = React.useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds))
    setElapsed(audio.currentTime)
  }, [])

  const skip = React.useCallback(
    (delta: number) => seekTo((audioRef.current?.currentTime ?? 0) + delta),
    [seekTo]
  )

  const stop = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setPlaying(false)
    setElapsed(0)
    savePrefs(slug, { chunkIndex: 0 })
  }, [slug])

  useMediaSession({ title, playing, play: toggle, pause: toggle, stop, skip })

  return (
    <Shell onClose={onClose}>
      <Transport
        playing={playing}
        elapsed={elapsed}
        duration={duration}
        rate={rate}
        onToggle={toggle}
        onSkip={skip}
        onSeekFraction={(fraction) => seekTo(fraction * duration)}
        onStop={stop}
        onRate={(next) => {
          setRate(next)
          if (audioRef.current) audioRef.current.playbackRate = next
          savePrefs(slug, { rate: next })
        }}
      />
    </Shell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   WEB SPEECH TRANSPORT — the free tier
   ═══════════════════════════════════════════════════════════════════════════ */

function SpeechTransport({
  slug,
  title,
  text,
  estimatedSeconds,
  onClose,
}: {
  slug: string
  title: string
  text: string
  estimatedSeconds: number
  onClose: () => void
}) {
  const chunks = React.useMemo(() => chunkText(text), [text])
  const duration = React.useMemo(
    () => chunks.reduce((sum, chunk) => sum + chunk.seconds, 0) || estimatedSeconds,
    [chunks, estimatedSeconds]
  )

  const [playing, setPlaying] = React.useState(false)
  const [voices, setVoices] = React.useState<SpeechSynthesisVoice[]>([])

  /*
   * Saved preferences come from LAZY INITIALISERS rather than an effect.
   *
   * This player is `dynamic({ ssr: false })`, so it renders only in the
   * browser and localStorage is safe to read here. Doing it in an effect
   * would render the defaults for one frame and then overwrite them, which
   * the reader sees as the speed control snapping to a different value.
   *
   * `chunkIndex` is clamped on the way in: an article edited since the last
   * visit may now be shorter than the position that was saved.
   */
  const [rate, setRate] = React.useState(() => loadPrefs(slug).rate)
  const [voiceURI, setVoiceURI] = React.useState<string | null>(
    () => loadPrefs(slug).voiceURI
  )
  const [index, setIndex] = React.useState(() =>
    Math.min(loadPrefs(slug).chunkIndex, Math.max(0, chunks.length - 1))
  )

  /*
   * Live mirrors of the state the utterance callbacks read.
   *
   * An `onend` handler is created once and fires minutes later; reading state
   * directly inside it would capture the value from the render that created
   * it, so a rate change or a seek would be invisible to the chunk already in
   * flight. These refs always hold the current values.
   */
  const indexRef = React.useRef(0)
  const playingRef = React.useRef(false)
  const rateRef = React.useRef(1)
  const voiceRef = React.useRef<string | null>(null)

  // Synced after every render — never during it. Assigning a ref while
  // rendering is a side effect in the render path; the callbacks that read
  // these all fire later, so after-commit is soon enough.
  React.useEffect(() => {
    indexRef.current = index
    playingRef.current = playing
    rateRef.current = rate
    voiceRef.current = voiceURI
  })

  /*
   * The voice list, which is genuinely asynchronous.
   *
   * `getVoices()` returns synchronously but is populated asynchronously — on
   * a cold page it returns an empty array and fills in later. `loadVoices()`
   * waits for `voiceschanged`, with a timeout for the engines that never fire
   * it. See lib/speech.ts.
   */
  React.useEffect(() => {
    void loadVoices().then((list) => setVoices(rankVoices(list)))
  }, [])

  const speakFrom = React.useCallback(
    (start: number) => {
      if (!speechSupported() || chunks.length === 0) return

      window.speechSynthesis.cancel()

      const voice = voiceRef.current
        ? (window.speechSynthesis
            .getVoices()
            .find((candidate) => candidate.voiceURI === voiceRef.current) ?? null)
        : null

      const speakChunk = (position: number) => {
        const chunk = chunks[position]
        if (!chunk) {
          // Reached the end of the article.
          setPlaying(false)
          playingRef.current = false
          setIndex(0)
          savePrefs(slug, { chunkIndex: 0 })
          return
        }

        const utterance = new SpeechSynthesisUtterance(chunk.text)
        utterance.rate = rateRef.current
        if (voice) {
          utterance.voice = voice
          utterance.lang = voice.lang
        }

        utterance.onend = () => {
          // `cancel()` also fires `onend`, so only advance if we are still
          // meant to be playing. Without this check a pause would silently
          // skip a chunk, and a seek would race the chunk it replaced.
          if (!playingRef.current) return
          const next = position + 1
          setIndex(next)
          savePrefs(slug, { chunkIndex: next })
          speakChunk(next)
        }

        utterance.onerror = (event) => {
          // 'interrupted' and 'canceled' are what our own pause and seek
          // produce; they are not failures.
          if (event.error === 'interrupted' || event.error === 'canceled') return
          setPlaying(false)
          playingRef.current = false
        }

        window.speechSynthesis.speak(utterance)
      }

      setPlaying(true)
      playingRef.current = true
      speakChunk(start)
    },
    [chunks, slug]
  )

  const toggle = React.useCallback(() => {
    if (playingRef.current) {
      /*
       * `cancel()`, not `pause()`.
       *
       * Chrome's `pause()` leaves the utterance in a state it frequently
       * cannot resume from, and Safari's is worse. Cancelling and re-speaking
       * the current chunk on resume costs at most one sentence replayed, and
       * it works in every engine.
       */
      setPlaying(false)
      playingRef.current = false
      window.speechSynthesis.cancel()
      return
    }
    speakFrom(indexRef.current)
  }, [speakFrom])

  const stop = React.useCallback(() => {
    setPlaying(false)
    playingRef.current = false
    setIndex(0)
    savePrefs(slug, { chunkIndex: 0 })
    if (speechSupported()) window.speechSynthesis.cancel()
  }, [slug])

  const goTo = React.useCallback(
    (target: number) => {
      const clamped = Math.min(Math.max(0, target), Math.max(0, chunks.length - 1))
      setIndex(clamped)
      savePrefs(slug, { chunkIndex: clamped })
      if (playingRef.current) speakFrom(clamped)
    },
    [chunks.length, slug, speakFrom]
  )

  /**
   * ±15s, expressed in chunks.
   *
   * Web Speech reports no position inside an utterance, so seconds have to be
   * converted to whole chunks: the skip lands on a sentence boundary near the
   * requested time rather than exactly on it. That is the honest limit of the
   * free tier, and it sounds better than cutting a sentence in half.
   */
  const skip = React.useCallback(
    (seconds: number) => {
      const averageChunk = duration / Math.max(1, chunks.length)
      const delta = Math.round(seconds / Math.max(1, averageChunk))
      // Never a no-op: a short article can make the rounded delta zero, and a
      // skip button that does nothing reads as broken.
      goTo(indexRef.current + (delta === 0 ? Math.sign(seconds) : delta))
    },
    [chunks.length, duration, goTo]
  )

  // Never leave a page still talking. `pagehide` fires where `unload` does
  // not — notably on iOS, and for back/forward-cache navigations.
  React.useEffect(() => {
    const cancel = () => {
      if (speechSupported()) window.speechSynthesis.cancel()
    }
    window.addEventListener('pagehide', cancel)
    return () => {
      window.removeEventListener('pagehide', cancel)
      cancel()
    }
  }, [])

  useMediaSession({
    title,
    playing,
    play: () => speakFrom(indexRef.current),
    pause: toggle,
    stop,
    skip,
  })

  const elapsed = chunks.slice(0, index).reduce((sum, chunk) => sum + chunk.seconds, 0)

  if (!speechSupported()) {
    return (
      <Shell onClose={onClose}>
        <p className="text-foreground-muted min-w-0 flex-1 text-sm">
          This browser cannot read articles aloud — Chrome, Edge and Safari can.
        </p>
      </Shell>
    )
  }

  return (
    <Shell onClose={onClose}>
      <Transport
        playing={playing}
        elapsed={elapsed}
        duration={duration}
        rate={rate}
        onToggle={toggle}
        onSkip={skip}
        onSeekFraction={(fraction) => goTo(Math.round(fraction * (chunks.length - 1)))}
        onStop={stop}
        onRate={(next) => {
          setRate(next)
          rateRef.current = next
          savePrefs(slug, { rate: next })
          // Rate is a property of an utterance, not of the synthesiser, so
          // the current chunk must restart for the change to be audible.
          if (playingRef.current) speakFrom(indexRef.current)
        }}
        voices={voices}
        voiceURI={voiceURI}
        onVoice={(next) => {
          setVoiceURI(next)
          voiceRef.current = next
          savePrefs(slug, { voiceURI: next })
          if (playingRef.current) speakFrom(indexRef.current)
        }}
      />
    </Shell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED CHROME
   ═══════════════════════════════════════════════════════════════════════════ */

function Transport({
  playing,
  elapsed,
  duration,
  rate,
  onToggle,
  onSkip,
  onSeekFraction,
  onStop,
  onRate,
  voices,
  voiceURI,
  onVoice,
}: {
  playing: boolean
  elapsed: number
  duration: number
  rate: number
  onToggle: () => void
  onSkip: (seconds: number) => void
  onSeekFraction: (fraction: number) => void
  onStop: () => void
  onRate: (rate: number) => void
  /** Speech transport only — a generated MP3 has one baked-in voice. */
  voices?: SpeechSynthesisVoice[]
  voiceURI?: string | null
  onVoice?: (voiceURI: string | null) => void
}) {
  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0

  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2.5">
        <button
          type="button"
          onClick={() => onSkip(-SKIP_SECONDS)}
          aria-label={`Back ${SKIP_SECONDS} seconds`}
          className={iconButton}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onToggle}
          aria-label={playing ? 'Pause' : 'Play'}
          className="bg-primary text-foreground-onbrand grid size-11 shrink-0 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95"
        >
          {playing ? (
            <Pause className="size-5" aria-hidden="true" />
          ) : (
            // Optically centred: a triangle's visual centre sits left of its
            // bounding box.
            <Play className="size-5 translate-x-px" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onSkip(SKIP_SECONDS)}
          aria-label={`Forward ${SKIP_SECONDS} seconds`}
          className={iconButton}
        >
          <RotateCw className="size-4" aria-hidden="true" />
        </button>

        {/* Progress. The timestamps are `tabular` so the scrubber does not
            jitter sideways as the digits change width. */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="tabular text-meta text-foreground-subtle shrink-0">
            {formatTime(elapsed)}
          </span>

          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(event) => onSeekFraction(Number(event.target.value) / 1000)}
            aria-label="Seek"
            aria-valuetext={`${formatTime(elapsed)} of ${formatTime(duration)}`}
            className="listen-range min-w-0 flex-1"
            style={{ ['--progress' as string]: `${progress * 100}%` }}
          />

          <span className="tabular text-meta text-foreground-subtle shrink-0">
            {formatTime(duration)}
          </span>
        </div>

        {/* Speed. Hidden on the narrowest screens, where the transport and the
            scrubber matter more than a 1.25x option. */}
        <label className="hidden shrink-0 sm:block">
          <span className="sr-only">Playback speed</span>
          <select
            value={rate}
            onChange={(event) => onRate(Number(event.target.value))}
            className={selectClass}
          >
            {RATES.map((value) => (
              <option key={value} value={value}>
                {value}x
              </option>
            ))}
          </select>
        </label>

        {voices && voices.length > 0 && onVoice ? (
          <label className="hidden shrink-0 lg:block">
            <span className="sr-only">Voice</span>
            <select
              value={voiceURI ?? ''}
              onChange={(event) => onVoice(event.target.value || null)}
              className={cn(selectClass, 'max-w-36 truncate')}
            >
              <option value="">Default voice</option>
              {/* Capped: some systems expose 200+ voices and a select that
                  long is unusable, especially on a phone. */}
              {voices.slice(0, 24).map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          className={cn(iconButton, 'hidden sm:grid')}
        >
          <Square className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Announced to screen readers without moving focus away from whatever
          the reader was doing. */}
      <span aria-live="polite" className="sr-only">
        {playing ? `Playing, ${formatTime(elapsed)} of ${formatTime(duration)}` : ''}
      </span>
    </>
  )
}

/**
 * Fixed mini-player: a bottom bar on mobile, a floating pill on desktop.
 *
 * `fixed` is the layout-stability decision — it is outside the document flow,
 * so showing or hiding the player cannot shift the article under the reader's
 * eyes, and it contributes nothing to CLS.
 */
function Shell({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  // Escape closes it, the expected way out of anything overlaid.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div
      role="region"
      aria-label="Article audio player"
      className={cn(
        'border-border fixed inset-x-0 bottom-0 z-50 border-t',
        'listen-surface px-3 py-2.5 shadow-lg',
        // Clears the iOS home indicator.
        'pb-[max(0.625rem,env(safe-area-inset-bottom))]',
        'sm:inset-x-auto sm:bottom-5 sm:left-1/2 sm:w-[min(52rem,calc(100vw-2.5rem))]',
        'sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:pb-2.5',
        'motion-safe:animate-[fade-up_0.3s_cubic-bezier(0.16,1,0.3,1)_both]'
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-1.5 sm:gap-3">
        <Headphones
          aria-hidden="true"
          className="text-primary hidden size-4 shrink-0 sm:block"
        />
        {children}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close the player"
          className={iconButton}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

/**
 * Lock-screen, notification-shade and headset controls.
 *
 * Worth the handful of lines: listening to an article happens with the phone
 * in a pocket, and without this the only way to pause is to unlock the device
 * and hunt for the tab.
 */
function useMediaSession({
  title,
  playing,
  play,
  pause,
  stop,
  skip,
}: {
  title: string
  playing: boolean
  play: () => void
  pause: () => void
  stop: () => void
  skip: (seconds: number) => void
}) {
  React.useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Devlume',
      album: 'Listen to this article',
    })
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'

    const handlers: [MediaSessionAction, () => void][] = [
      ['play', play],
      ['pause', pause],
      ['stop', stop],
      ['seekbackward', () => skip(-SKIP_SECONDS)],
      ['seekforward', () => skip(SKIP_SECONDS)],
    ]

    for (const [action, handler] of handlers) {
      // Browsers throw for actions they do not implement; that is not an
      // error, it is just a smaller set of controls.
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        /* unsupported action */
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          /* unsupported action */
        }
      }
    }
  }, [title, playing, play, pause, stop, skip])
}

const iconButton = cn(
  'grid size-9 shrink-0 place-items-center rounded-lg',
  'text-foreground-muted transition-colors',
  'hover:bg-surface-2 hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
)

const selectClass = cn(
  'rounded-md border border-border bg-surface px-1.5 py-1',
  'text-xs tabular text-foreground-muted',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35'
)
