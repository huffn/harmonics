import { LEVELS, LEVEL_ORDER, LEVEL_LABELS, type LevelId } from './levels'

export { LEVELS, LEVEL_ORDER, LEVEL_LABELS }
export type { LevelId }

export type WindState = {
  gamesWon: LevelId[]
  level: LevelId | null
  positions: number[]
  found: string[]
  extraFound: string[]
  won: boolean
}

const blank = (w: string) => '-'.repeat(w.length)

export function initialWindState(): WindState {
  return { gamesWon: [], level: null, positions: [], found: [], extraFound: [], won: false }
}

export function isLevelUnlocked(id: LevelId, gamesWon: LevelId[]): boolean {
  const i = LEVEL_ORDER.indexOf(id)
  return i <= 0 || gamesWon.includes(LEVEL_ORDER[i - 1])
}

export function startLevel(s: WindState, id: LevelId): WindState {
  const lv = LEVELS[id]
  return {
    ...s,
    level: id,
    positions: lv.columns.map(c => c.initialPosition),
    found: lv.goalWords.map(blank),
    extraFound: lv.potentialWords.map(blank),
    won: false
  }
}

export function currentWord(id: LevelId, positions: number[]): string {
  return LEVELS[id].columns.map((c, i) => c.letters[positions[i]]).join('')
}

// The original's win effect: every goal word found.
function applyWin(s: WindState): WindState {
  if (s.level === null || s.won) return s
  if (!LEVELS[s.level].goalWords.every(w => s.found.includes(w))) return s
  return { ...s, won: true, gamesWon: s.gamesWon.includes(s.level) ? s.gamesWon : [...s.gamesWon, s.level] }
}

export function shiftColumn(s: WindState, col: number, to: number): WindState {
  if (s.level === null) return s
  const lv = LEVELS[s.level]
  const column = lv.columns[col]
  if (!column) return s
  const pos = Math.min(Math.max(to, 0), column.letters.length - 1)
  const positions = s.positions.with(col, pos)
  const word = currentWord(s.level, positions)
  let found = s.found
  let extraFound = s.extraFound
  const gi = lv.goalWords.indexOf(word)
  if (gi >= 0 && !found.includes(word)) found = found.with(gi, word)
  const xi = lv.potentialWords.indexOf(word)
  if (xi >= 0 && !extraFound.includes(word)) extraFound = extraFound.with(xi, word)
  return applyWin({ ...s, positions, found, extraFound })
}

export function continueAfterWin(s: WindState): WindState {
  return {
    ...s,
    level: null,
    positions: [],
    found: [],
    extraFound: [],
    won: false,
    gamesWon: s.gamesWon.length === 3 ? [] : s.gamesWon
  }
}

export function forceWin(s: WindState): WindState {
  if (s.level === null) return s
  return applyWin({ ...s, found: [...LEVELS[s.level].goalWords] })
}

const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')
const isLevelId = (v: unknown): v is LevelId => typeof v === 'string' && (LEVEL_ORDER as string[]).includes(v)

export function isWindState(v: unknown): v is WindState {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  if (!Array.isArray(o.gamesWon) || !o.gamesWon.every(isLevelId)) return false
  if (typeof o.won !== 'boolean') return false
  if (!Array.isArray(o.positions) || !o.positions.every(n => Number.isInteger(n))) return false
  if (!isStrArr(o.found) || !isStrArr(o.extraFound)) return false
  if (o.level === null) {
    return o.positions.length === 0 && o.found.length === 0 && o.extraFound.length === 0 && o.won === false
  }
  if (!isLevelId(o.level)) return false
  const lv = LEVELS[o.level]
  const positions = o.positions as number[]
  return (
    positions.length === lv.columns.length &&
    o.found.length === lv.goalWords.length &&
    o.extraFound.length === lv.potentialWords.length &&
    positions.every((n, i) => n >= 0 && n < lv.columns[i].letters.length)
  )
}
