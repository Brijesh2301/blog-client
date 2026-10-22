import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { chunkText, formatTime, rankVoices } from '@/lib/speech'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * WEB SPEECH CHUNKING
 * ═════════════════════════════════════════════════════════════════════════════
 * Chunking is not a nicety — it is what makes the free Listen tier work at
 * all. Chrome silently truncates utterances past roughly 32KB, `onboundary`
 * is unreliable across engines, and seeking has to be index arithmetic
 * because the API exposes no position inside an utterance.
 *
 * So the invariants that matter are: nothing is dropped, nothing exceeds the
 * engine's comfort zone, and chunks end at sentence boundaries — a chunk that
 * ends mid-sentence makes the synthesiser lose its intonation and sound
 * robotic at every single seam.
 */

const SENTENCE = 'This is a sentence of a fairly typical length for prose. '

describe('chunkText', () => {
  test('returns nothing for empty input', () => {
    assert.deepEqual(chunkText(''), [])
    assert.deepEqual(chunkText('   \n  '), [])
  })

  test('keeps a short text as a single chunk', () => {
    const chunks = chunkText('One short sentence.')
    assert.equal(chunks.length, 1)
    assert.equal(chunks[0]!.text, 'One short sentence.')
  })

  test('loses no words from a long article', () => {
    const source = SENTENCE.repeat(80)
    const sourceWords = source.trim().split(/\s+/).length
    const chunkedWords = chunkText(source)
      .map((c) => c.text.trim().split(/\s+/).length)
      .reduce((a, b) => a + b, 0)

    assert.equal(chunkedWords, sourceWords, 'chunking must not drop or duplicate words')
  })

  test('ends chunks at sentence boundaries', () => {
    for (const chunk of chunkText(SENTENCE.repeat(40))) {
      assert.match(chunk.text, /[.!?]$/, `chunk ended mid-sentence: "${chunk.text}"`)
    }
  })

  test('keeps every chunk well inside the engine limit', () => {
    for (const chunk of chunkText(SENTENCE.repeat(60))) {
      assert.ok(chunk.text.length < 1000, `chunk too long: ${chunk.text.length}`)
    }
  })

  test('splits a pathologically long sentence rather than emitting it whole', () => {
    // A 2000-character "sentence" with no terminal punctuation must still be
    // broken up, or Chrome truncates it and the article stops mid-word.
    const runOn = 'word '.repeat(400).trim()
    const chunks = chunkText(runOn)

    assert.ok(chunks.length > 1, 'a run-on sentence must still be split')
    for (const chunk of chunks) {
      assert.ok(chunk.text.length <= 260, `chunk too long: ${chunk.text.length}`)
    }
  })

  test('numbers chunks consecutively from zero', () => {
    const chunks = chunkText(SENTENCE.repeat(20))
    chunks.forEach((chunk, i) => assert.equal(chunk.index, i))
  })

  test('gives every chunk a positive duration', () => {
    for (const chunk of chunkText(SENTENCE.repeat(20))) {
      assert.ok(chunk.seconds >= 1, `non-positive duration: ${chunk.seconds}`)
    }
  })

  test('total duration is proportional to length', () => {
    const total = (text: string) => chunkText(text).reduce((sum, c) => sum + c.seconds, 0)

    assert.ok(total(SENTENCE.repeat(40)) > total(SENTENCE.repeat(20)))
  })

  test('normalises whitespace rather than speaking it', () => {
    const chunks = chunkText('One.\n\n\n   Two.\t\tThree.')
    assert.ok(!chunks.some((c) => /\s{2,}/.test(c.text)))
  })

  test('is deterministic', () => {
    const source = SENTENCE.repeat(25)
    assert.deepEqual(chunkText(source), chunkText(source))
  })
})

describe('formatTime', () => {
  test('formats minutes and seconds with a padded seconds field', () => {
    assert.equal(formatTime(0), '0:00')
    assert.equal(formatTime(9), '0:09')
    assert.equal(formatTime(60), '1:00')
    assert.equal(formatTime(95), '1:35')
    assert.equal(formatTime(3600), '60:00')
  })

  test('never renders a negative time', () => {
    assert.equal(formatTime(-5), '0:00')
  })

  test('rounds rather than truncating', () => {
    assert.equal(formatTime(59.6), '1:00')
  })
})

describe('rankVoices', () => {
  const voice = (
    name: string,
    lang: string,
    localService: boolean
  ): SpeechSynthesisVoice =>
    ({ name, lang, localService, voiceURI: name, default: false }) as SpeechSynthesisVoice

  test('puts English voices first, since that is the article language', () => {
    const ranked = rankVoices([
      voice('Zara', 'fr-FR', true),
      voice('Alex', 'en-GB', true),
    ])
    assert.equal(ranked[0]!.name, 'Alex')
  })

  test('prefers local voices, which start without a network round trip', () => {
    const ranked = rankVoices([
      voice('Remote', 'en-US', false),
      voice('Local', 'en-US', true),
    ])
    assert.equal(ranked[0]!.name, 'Local')
  })

  test('falls back to alphabetical order for otherwise equal voices', () => {
    const ranked = rankVoices([
      voice('Bravo', 'en-US', true),
      voice('Alpha', 'en-US', true),
    ])
    assert.deepEqual(
      ranked.map((v) => v.name),
      ['Alpha', 'Bravo']
    )
  })

  test('does not mutate the array it was given', () => {
    const input = [voice('B', 'fr-FR', false), voice('A', 'en-US', true)]
    const names = input.map((v) => v.name)
    rankVoices(input)
    assert.deepEqual(
      input.map((v) => v.name),
      names
    )
  })
})
