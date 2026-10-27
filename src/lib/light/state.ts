// Game state and the rules for placing pieces. Each harmonic records the slot
// it sits in (or null); any harmonic fits any empty slot. The splitter only
// fits its own slot, so a boolean is enough.
import { COLORS, type Color } from './geometry';
import type { Cell, Level } from './level';

export type CellKind = 'out' | 'emitter' | 'splitter' | 'seal' | 'slot' | 'pillar' | 'empty';
export type PlaceResult = { ok: true } | { ok: false; reason: string };

export interface TableState {
  mirrorsAvailable: number;
  mirrors: Map<string, number>;
  harmonics: Record<Color, string | null>;
  splitterPlaced: boolean;
  harmonicsRevealed: boolean;
  lightUncovered: boolean;
}

export const MAX_MIRRORS = 10;

const key = (c: number, r: number) => `${c},${r}`;
const at = (p: Cell, c: number, r: number) => p.c === c && p.r === r;

export function cellKind(level: Level, c: number, r: number): CellKind {
  if (c < 0 || r < 0 || c >= level.cols || r >= level.rows) return 'out';
  if (at(level.emitter, c, r)) return 'emitter';
  if (at(level.splitter, c, r)) return 'splitter';
  if (at(level.seal, c, r)) return 'seal';
  if (slotAt(level, c, r)) return 'slot';
  if (level.pillars.some((p) => at(p, c, r))) return 'pillar';
  return 'empty';
}

export function slotAt(level: Level, c: number, r: number): string | null {
  return Object.keys(level.slots).find((key) => at(level.slots[key], c, r)) || null;
}

export function harmonicIn(s: TableState, slot: string): Color | null {
  return COLORS.find((color) => s.harmonics[color] === slot) || null;
}

export function createState(_level: Level, mirrorsAvailable: number = MAX_MIRRORS): TableState {
  return {
    mirrorsAvailable: clamp(mirrorsAvailable),
    mirrors: new Map(),
    harmonics: { green: null, red: null, yellow: null, blue: null },
    splitterPlaced: false,
    harmonicsRevealed: false,
    lightUncovered: false, // a bowl hides the light until the party lifts it
  };
}

function clamp(n: unknown): number {
  return Math.max(0, Math.min(MAX_MIRRORS, Math.floor(Number(n) || 0)));
}

export function placeMirror(level: Level, s: TableState, c: number, r: number): PlaceResult {
  if (cellKind(level, c, r) !== 'empty' || s.mirrors.has(key(c, r))) return { ok: false, reason: 'occupied' };
  if (s.mirrors.size >= s.mirrorsAvailable) return { ok: false, reason: 'none-left' };
  s.mirrors.set(key(c, r), 2);
  return { ok: true };
}

export function rotateMirror(s: TableState, c: number, r: number, step: number): void {
  const k = key(c, r);
  if (!s.mirrors.has(k)) return;
  s.mirrors.set(k, (((s.mirrors.get(k)! + step) % 8) + 8) % 8);
}

export function removeMirror(s: TableState, c: number, r: number): void {
  s.mirrors.delete(key(c, r));
}

export function placeHarmonic(level: Level, s: TableState, color: Color, c: number, r: number): PlaceResult {
  const slot = slotAt(level, c, r);
  if (!slot) return { ok: false, reason: 'not-a-slot' };
  const there = harmonicIn(s, slot);
  if (there && there !== color) return { ok: false, reason: 'occupied' };
  s.harmonics[color] = slot;
  return { ok: true };
}

export function removeHarmonic(s: TableState, color: Color): void {
  s.harmonics[color] = null;
}

export function placeSplitter(level: Level, s: TableState, c: number, r: number): PlaceResult {
  if (!at(level.splitter, c, r)) return { ok: false, reason: 'not-its-slot' };
  s.splitterPlaced = true;
  return { ok: true };
}

export function removeSplitter(s: TableState): void {
  s.splitterPlaced = false;
}

export function uncoverLight(s: TableState): void {
  s.lightUncovered = true;
}

// The GM reveals the harmonics panel once the players bring them up.
export function revealHarmonics(s: TableState): void {
  s.harmonicsRevealed = true;
}

export function setMirrorsAvailable(s: TableState, n: number): void {
  s.mirrorsAvailable = clamp(n);
}

export function resetBoard(s: TableState): void {
  s.mirrors.clear();
  for (const color of COLORS) s.harmonics[color] = null;
  s.splitterPlaced = false;
}

export function serialize(s: TableState): string {
  return JSON.stringify({
    mirrorsAvailable: s.mirrorsAvailable, mirrors: [...s.mirrors], harmonics: s.harmonics, splitterPlaced: s.splitterPlaced,
    harmonicsRevealed: s.harmonicsRevealed, lightUncovered: s.lightUncovered,
  });
}

export function deserialize(level: Level, str: string): TableState | null {
  let data: any;
  try {
    data = JSON.parse(str);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.mirrors)) return null;
  const s = createState(level, data.mirrorsAvailable);
  for (const entry of data.mirrors) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') return null;
    const [k, angle] = entry as [string, number];
    if (!Number.isInteger(angle) || angle < 0 || angle > 7) return null;
    const [c, r] = k.split(',').map(Number);
    if (cellKind(level, c, r) === 'empty') s.mirrors.set(key(c, r), angle);
  }
  const h = data.harmonics || {};
  for (const color of COLORS) {
    const slot = h[color];
    if (typeof slot === 'string' && level.slots[slot] && !harmonicIn(s, slot)) s.harmonics[color] = slot;
  }
  s.splitterPlaced = data.splitterPlaced === true;
  s.harmonicsRevealed = data.harmonicsRevealed === true;
  s.lightUncovered = data.lightUncovered === true;
  return s;
}
