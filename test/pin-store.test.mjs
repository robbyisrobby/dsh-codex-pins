import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  decodeStoredPins,
  formatPinTime,
  normalizePins,
  prunePins,
  sessionIdForTitle,
  setPinned,
  titlesToIds,
} from '../pin-store.mjs'

test('normalizePins drops junk, duplicates, and caps at 50', () => {
  const ids = Array.from({ length: 60 }, (_, i) => `session-${String(i).padStart(6, '0')}`)
  const out = normalizePins(['nope', ids[0], ids[0], 12, ids[1], ...ids])
  assert.equal(out.length, 50)
  assert.equal(out[0], ids[0])
  assert.equal(out[1], ids[1])
})

test('decodeStoredPins reads arrays and dsh-session-pin envelopes', () => {
  assert.deepEqual(decodeStoredPins(['session-aaaaaa', 'bad']), ['session-aaaaaa'])
  assert.deepEqual(
    decodeStoredPins({ pinned: ['session-bbbbbb'], workspacePinned: ['ws-1'] }),
    ['session-bbbbbb'],
  )
  assert.deepEqual(decodeStoredPins(null), [])
})

test('setPinned inserts newest-first and unpins', () => {
  const a = 'session-aaaaaa'
  const b = 'session-bbbbbb'
  const first = setPinned([], a, true)
  assert.deepEqual(first.pinned, [a])
  const second = setPinned(first.pinned, b, true)
  assert.deepEqual(second.pinned, [b, a])
  const again = setPinned(second.pinned, a, true)
  assert.deepEqual(again.pinned, [a, b])
  const off = setPinned(again.pinned, a, false)
  assert.deepEqual(off.pinned, [b])
})

test('setPinned refuses a 51st pin', () => {
  const full = Array.from({ length: 50 }, (_, i) => `session-${String(i).padStart(6, '0')}`)
  const result = setPinned(full, 'session-zzzzzz', true)
  assert.equal(result.limited, true)
  assert.equal(result.pinned.length, 50)
})

test('prunePins keeps only live ids', () => {
  assert.deepEqual(
    prunePins(['session-aaaaaa', 'session-bbbbbb'], ['session-bbbbbb']),
    ['session-bbbbbb'],
  )
})

test('sessionIdForTitle prefers unique titles, then the current session', () => {
  const list = {
    ids: ['session-aaaaaa', 'session-bbbbbb', 'session-cccccc'],
    byId: {
      'session-aaaaaa': { displayTitle: 'Alpha' },
      'session-bbbbbb': { displayTitle: 'Dup' },
      'session-cccccc': { displayTitle: 'Dup' },
    },
  }
  const byTitle = titlesToIds(list)
  assert.equal(sessionIdForTitle('Alpha', byTitle), 'session-aaaaaa')
  assert.equal(sessionIdForTitle('Dup', byTitle), undefined)
  assert.equal(sessionIdForTitle('Dup', byTitle, 'session-cccccc'), 'session-cccccc')
  assert.equal(sessionIdForTitle('Missing', byTitle), undefined)
})

test('formatPinTime is bilingual', () => {
  const now = 1_000_000_000_000
  assert.equal(formatPinTime(now - 10_000, 'zh', now), '刚刚')
  assert.equal(formatPinTime(now - 10_000, 'en', now), 'now')
  assert.equal(formatPinTime(now - 3 * 60_000, 'zh', now), '3分钟')
  assert.equal(formatPinTime(now - 5 * 3_600_000, 'en', now), '5h')
})
