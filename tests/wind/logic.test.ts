import { expect, test } from 'vitest'
import {
  LEVELS, LEVEL_ORDER, continueAfterWin, currentWord, forceWin, initialWindState,
  isLevelUnlocked, isWindState, shiftColumn, startLevel
} from '#lib/wind/logic'

test('only EASY starts unlocked', () =>
  expect(LEVEL_ORDER.map(id => isLevelUnlocked(id, []))).toEqual([true, false, false]))
test('initial word comes from initial positions', () => {
  const s = startLevel(initialWindState(), 'EASY')
  expect(currentWord('EASY', s.positions)).toBe(LEVELS.EASY.columns.map(c => c.letters[c.initialPosition]).join(''))
})
test('forming every goal word wins and unlocks the next level', () => {
  let s = startLevel(initialWindState(), 'EASY')
  for (const w of LEVELS.EASY.goalWords)
    LEVELS.EASY.columns.forEach((c, i) => { s = shiftColumn(s, i, c.letters.indexOf(w[i])) })
  expect(s.won).toBe(true); expect(isLevelUnlocked('MEDIUM', s.gamesWon)).toBe(true)
})
test('potential words are recorded but do not win', () => {
  const w = LEVELS.EASY.potentialWords[0]
  let s = startLevel(initialWindState(), 'EASY')
  LEVELS.EASY.columns.forEach((c, i) => { s = shiftColumn(s, i, c.letters.indexOf(w[i])) })
  expect(s.extraFound).toContain(w); expect(s.won).toBe(false)
})
test('positions clamp to the column', () => {
  const s = shiftColumn(startLevel(initialWindState(), 'EASY'), 0, 99)
  expect(s.positions[0]).toBe(LEVELS.EASY.columns[0].letters.length - 1)
  expect(shiftColumn(s, 0, -5).positions[0]).toBe(0)
})
test('continuing after the third win clears progress', () =>
  expect(continueAfterWin({ ...initialWindState(), gamesWon: ['EASY', 'MEDIUM', 'HARD'], won: true }).gamesWon).toEqual([]))
test('forceWin on the menu does nothing', () => expect(forceWin(initialWindState())).toEqual(initialWindState()))
test('state validates after JSON round-trip', () => {
  const s = startLevel(initialWindState(), 'EASY'); expect(isWindState(JSON.parse(JSON.stringify(s)))).toBe(true)
})
test('placeholders, forceWin and continue', () => {
  const s = startLevel(initialWindState(), 'MEDIUM')
  expect(s.found).toEqual(LEVELS.MEDIUM.goalWords.map(w => '-'.repeat(w.length)))
  const w = forceWin(s)
  expect(w.won).toBe(true); expect(w.found).toEqual(LEVELS.MEDIUM.goalWords); expect(w.gamesWon).toEqual(['MEDIUM'])
  const c = continueAfterWin(w)
  expect(c.level).toBeNull(); expect(c.won).toBe(false); expect(c.gamesWon).toEqual(['MEDIUM'])
})
test('every goal and potential word is formable from its columns', () => {
  for (const id of LEVEL_ORDER)
    for (const w of [...LEVELS[id].goalWords, ...LEVELS[id].potentialWords])
      LEVELS[id].columns.forEach((c, i) => expect(c.letters).toContain(w[i]))
})
test('isWindState rejects junk', () => {
  expect(isWindState(null)).toBe(false)
  expect(isWindState({ ...initialWindState(), level: 'NOPE' })).toBe(false)
})

test('replaying a won level does not duplicate gamesWon or wipe progress', () => {
  let s = forceWin(startLevel(initialWindState(), 'EASY'))
  s = forceWin(startLevel(continueAfterWin(s), 'EASY'))
  expect(s.gamesWon).toEqual(['EASY'])
  expect(continueAfterWin(forceWin(startLevel(continueAfterWin(s), 'EASY'))).gamesWon).toEqual(['EASY'])
  let t = startLevel(continueAfterWin(forceWin(startLevel(initialWindState(), 'EASY'))), 'EASY')
  for (const w of LEVELS.EASY.goalWords)
    LEVELS.EASY.columns.forEach((c, i) => { t = shiftColumn(t, i, c.letters.indexOf(w[i])) })
  expect(t.won).toBe(true); expect(t.gamesWon).toEqual(['EASY'])
})
test('isWindState rejects state inconsistent with its level', () => {
  const ok = startLevel(initialWindState(), 'EASY')
  expect(isWindState(ok)).toBe(true)
  expect(isWindState({ ...ok, positions: [] })).toBe(false)
  expect(isWindState({ ...ok, found: [] })).toBe(false)
  expect(isWindState({ ...ok, extraFound: ok.extraFound.slice(1) })).toBe(false)
  expect(isWindState({ ...ok, positions: [99, 0, 0, 0] })).toBe(false)
  expect(isWindState({ ...ok, positions: [-1, 0, 0, 0] })).toBe(false)
  expect(isWindState({ ...ok, positions: [0.5, 0, 0, 0] })).toBe(false)
  expect(isWindState({ ...initialWindState(), positions: [0] })).toBe(false)
  expect(isWindState({ ...initialWindState(), won: true })).toBe(false)
  expect(isWindState({ ...initialWindState(), found: ['-'] })).toBe(false)
})

test('isWindState accepts states the logic produces', () => {
  const started = startLevel(initialWindState(), 'EASY')
  const mid = shiftColumn(started, 0, LEVELS.EASY.columns[0].letters.length - 1)
  const won = forceWin(started)
  expect(won.won).toBe(true)
  const continued = continueAfterWin(won)
  for (const s of [initialWindState(), started, mid, won, continued]) expect(isWindState(s)).toBe(true)
})
