import { beforeEach, expect, test } from 'vitest'
import { loadSession, saveSession, clearSession } from '#lib/shared/session'
const isNum = (v: unknown): v is { n: number } => typeof (v as any)?.n === 'number'
beforeEach(() => sessionStorage.clear())
test('round-trips a value', () => {
  saveSession('puzzle:x', { n: 3 })
  expect(loadSession('puzzle:x', isNum)).toEqual({ n: 3 })
})
test('missing key gives null', () => expect(loadSession('puzzle:x', isNum)).toBeNull())
test('bad JSON gives null', () => {
  sessionStorage.setItem('puzzle:x', '{not json')
  expect(loadSession('puzzle:x', isNum)).toBeNull()
})
test('failed validator gives null', () => {
  saveSession('puzzle:x', { n: 'three' })
  expect(loadSession('puzzle:x', isNum)).toBeNull()
})
test('clear removes it', () => {
  saveSession('puzzle:x', { n: 1 }); clearSession('puzzle:x')
  expect(sessionStorage.getItem('puzzle:x')).toBeNull()
})
