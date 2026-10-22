import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  CONSENT_BOOTSTRAP,
  CONSENT_COOKIE,
  CONSENT_VERSION,
  DEFAULT_CONSENT,
  parseConsent,
} from '@/lib/consent'

/**
 * ═════════════════════════════════════════════════════════════════════════════
 * CONSENT
 * ═════════════════════════════════════════════════════════════════════════════
 * Getting this wrong is a regulatory problem, not a bug report, so the
 * failure mode that matters is failing OPEN — treating an absent, corrupt,
 * expired or stale-version value as consent.
 *
 * Every test here is a different way of handing `parseConsent` something it
 * should refuse. `parseConsent` is the only path into a granted state, so if
 * it never returns a grant it did not read, nothing downstream can either.
 */

const freshValue = (overrides: Record<string, unknown> = {}) =>
  encodeURIComponent(
    JSON.stringify({
      necessary: true,
      analytics: true,
      advertising: true,
      decidedAt: new Date().toISOString(),
      version: CONSENT_VERSION,
      ...overrides,
    })
  )

describe('parseConsent refuses anything it should not trust', () => {
  test('null and empty input', () => {
    assert.equal(parseConsent(null), null)
    assert.equal(parseConsent(undefined), null)
    assert.equal(parseConsent(''), null)
  })

  test('malformed JSON', () => {
    assert.equal(parseConsent('not json at all'), null)
    assert.equal(parseConsent('%7Bbroken'), null)
  })

  test('a JSON value that is not an object', () => {
    for (const value of ['"a string"', '42', 'true', 'null', '[1,2]']) {
      const parsed = parseConsent(encodeURIComponent(value))
      assert.ok(parsed === null || typeof parsed === 'object')
      if (value !== '[1,2]') assert.equal(parsed, null)
    }
  })

  test('a decision with no timestamp', () => {
    assert.equal(parseConsent(freshValue({ decidedAt: undefined })), null)
    assert.equal(parseConsent(freshValue({ decidedAt: 12345 })), null)
  })

  test('a decision with an unparseable timestamp', () => {
    assert.equal(parseConsent(freshValue({ decidedAt: 'last tuesday' })), null)
  })

  test('a decision older than twelve months', () => {
    // Consent is not indefinite. A stale value must re-ask, not persist.
    const old = new Date(Date.now() - 400 * 86_400_000).toISOString()
    assert.equal(parseConsent(freshValue({ decidedAt: old })), null)
  })

  test('a decision recorded against an older category set', () => {
    // The categories changed meaning, so the old answer is not an answer to
    // the current question.
    assert.equal(parseConsent(freshValue({ version: CONSENT_VERSION - 1 })), null)
    assert.equal(parseConsent(freshValue({ version: undefined })), null)
  })
})

describe('parseConsent normalises what it does accept', () => {
  test('reads a current grant', () => {
    const parsed = parseConsent(freshValue())
    assert.ok(parsed)
    assert.equal(parsed.analytics, true)
    assert.equal(parsed.advertising, true)
  })

  test('reads a current refusal', () => {
    const parsed = parseConsent(freshValue({ analytics: false, advertising: false }))
    assert.ok(parsed)
    assert.equal(parsed.analytics, false)
    assert.equal(parsed.advertising, false)
  })

  test('treats any non-true value as a refusal', () => {
    // "truthy" is not consent. Only an explicit `true` grants.
    for (const value of ['yes', 1, {}, [], 'true']) {
      const parsed = parseConsent(freshValue({ advertising: value }))
      assert.ok(parsed)
      assert.equal(parsed.advertising, false, `"${String(value)}" must not grant`)
    }
  })

  test('necessary is always true and cannot be turned off', () => {
    const parsed = parseConsent(freshValue({ necessary: false }))
    assert.ok(parsed)
    assert.equal(parsed.necessary, true)
  })

  test('never returns a version other than the current one', () => {
    const parsed = parseConsent(freshValue())
    assert.equal(parsed?.version, CONSENT_VERSION)
  })
})

describe('defaults', () => {
  test('the default state grants nothing optional', () => {
    assert.equal(DEFAULT_CONSENT.analytics, false)
    assert.equal(DEFAULT_CONSENT.advertising, false)
    assert.equal(DEFAULT_CONSENT.decidedAt, null)
  })
})

describe('the inline bootstrap script', () => {
  test('sets every Consent Mode v2 signal to denied by default', () => {
    for (const signal of [
      'ad_storage',
      'ad_user_data',
      'ad_personalization',
      'analytics_storage',
    ]) {
      assert.match(
        CONSENT_BOOTSTRAP,
        new RegExp(`${signal}\\s*:\\s*'denied'`),
        `${signal} must default to denied`
      )
    }
  })

  test('declares the default BEFORE any update', () => {
    // Order is the whole point: an update that runs first would leave a
    // window in which Google's tags assume consent.
    const defaultAt = CONSENT_BOOTSTRAP.indexOf("'default'")
    const updateAt = CONSENT_BOOTSTRAP.indexOf("'update'")

    assert.ok(defaultAt > -1 && updateAt > -1)
    assert.ok(defaultAt < updateAt, 'consent default must be declared first')
  })

  test('reads the cookie this module writes', () => {
    assert.ok(CONSENT_BOOTSTRAP.includes(CONSENT_COOKIE))
  })

  test('version-checks the stored cookie', () => {
    // Without this an old cookie would silently grant under new categories.
    assert.match(CONSENT_BOOTSTRAP, /version\s*===\s*\d+/)
  })

  test('is wrapped so it leaks nothing into global scope', () => {
    assert.ok(CONSENT_BOOTSTRAP.startsWith('(function()'))
  })

  test('cannot throw and break the page', () => {
    // It runs in <head> before anything else; an exception here would take
    // the whole document with it.
    assert.match(CONSENT_BOOTSTRAP, /try\s*\{[\s\S]*\}\s*catch/)
  })
})
