// Draws the table as a stack of layers in board units (viewBox 0 0 cols rows).
// Anything that animates continuously lives in a layer of its own and only
// fades or moves as a whole, so the browser never has to redraw the busy board
// every frame (that cost a full CPU core in Safari):
//   map     the greyscale map, drawn once
//   glow    country glows; the whole layer pulses
//   halo    beam halos and impact pools; the whole layer pulses
//   board   grid, pieces, beam cores, mirrors: the interactive layer
//   sparks  HTML sparks, moved by the compositor
//   bowl    the HTML bowl over the light
// createBoard builds the layers once; drawDynamic redraws what changes.
import { asset } from '$app/paths';
import type { Color } from './geometry';
import type { Level } from './level';
import type { TableState } from './state';
import type { TraceResult } from './trace';

const NS = 'http://www.w3.org/2000/svg';
export const COLOR_HEX: Record<string, string> = { white: '#fffbe8', green: '#4ade80', red: '#f87171', yellow: '#facc15', blue: '#60a5fa' };
// Countries glow through their shape masks, in whichever color lights them.
const COUNTRIES = ['dhruv', 'galatea', 'samitra', 'volund'];
const PRISM_PATH = 'M0 -0.38 L0.36 0.28 L-0.36 0.28 Z';

function el(name: string, attrs: Record<string, string | number> = {}, parent?: Element): SVGElement {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (parent) parent.appendChild(node);
  return node as SVGElement;
}

function div(cls: string, parent?: Element): HTMLDivElement {
  const node = document.createElement('div');
  node.className = cls;
  if (parent) parent.appendChild(node);
  return node;
}

function layer(stack: HTMLElement, id: string, cls: string, level: Level): SVGSVGElement {
  const svg = el('svg', {
    id, class: `layer ${cls}`, viewBox: `0 0 ${level.cols} ${level.rows}`, preserveAspectRatio: 'none',
  }, stack) as SVGSVGElement;
  if (id !== 'board') svg.setAttribute('aria-hidden', 'true');
  return svg;
}

// Shared paint servers, filters and masks; referenced from every layer.
function addDefs(svg: SVGElement, level: Level) {
  const { cols, rows } = level;
  const defs = el('defs', {}, svg);
  // Sized to the whole board: a horizontal or vertical beam has a zero-height
  // or zero-width box, so a filter region relative to the beam itself vanishes.
  const glow = el('filter', {
    id: 'beam-glow', filterUnits: 'userSpaceOnUse', x: -1, y: -1, width: cols + 2, height: rows + 2,
  }, defs);
  el('feGaussianBlur', { stdDeviation: '0.09' }, glow);
  const stone = el('radialGradient', { id: 'stone', cx: '35%', cy: '30%', r: '80%' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#8a8073' }, stone);
  el('stop', { offset: '100%', 'stop-color': '#3a342d' }, stone);
  const bloom = el('radialGradient', { id: 'bloom' }, defs);
  el('stop', { offset: '0%', 'stop-color': '#fffbe8', 'stop-opacity': '1' }, bloom);
  el('stop', { offset: '100%', 'stop-color': '#fffbe8', 'stop-opacity': '0' }, bloom);
  const bronze = el('linearGradient', { id: 'bronze', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  [['0%', '#c9a46a'], ['45%', '#8a6a3c'], ['100%', '#3e2e19']].forEach(([offset, color]) =>
    el('stop', { offset, 'stop-color': color }, bronze));
  const prism = el('linearGradient', { id: 'prism', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
  [['0%', '#4ade80'], ['33%', '#60a5fa'], ['66%', '#facc15'], ['100%', '#f87171']].forEach(([offset, color]) =>
    el('stop', { offset, 'stop-color': color }, prism));
  for (const name of [...COUNTRIES, 'radiant']) {
    const mask = el('mask', { id: `mask-${name}`, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: cols, height: rows }, defs);
    el('image', { href: asset(`light/assets/mask-${name}.png` as Parameters<typeof asset>[0]), width: cols, height: rows, preserveAspectRatio: 'none' }, mask);
  }
}

export function createBoard(stack: HTMLElement, level: Level): SVGSVGElement {
  const { cols, rows } = level;
  stack.innerHTML = '';

  const mapLayer = layer(stack, 'layer-map', 'map-layer', level);
  addDefs(mapLayer, level);
  el('image', { class: 'map', href: asset('light/assets/map-grey.jpg'), width: cols, height: rows, preserveAspectRatio: 'none' }, mapLayer);

  const glowLayer = layer(stack, 'layer-glow', 'glow-layer', level);
  for (const name of [...COUNTRIES, 'radiant']) {
    el('rect', {
      class: `glow glow-${name}`, width: cols, height: rows, mask: `url(#mask-${name})`,
      fill: name === 'radiant' ? COLOR_HEX.white : 'none',
    }, glowLayer);
  }

  const halo = layer(stack, 'layer-halo', 'halo-layer', level);
  el('g', { class: 'beams-halo' }, halo);
  el('g', { class: 'pools' }, halo);

  const svg = layer(stack, 'board', 'board-layer', level);
  let d = '';
  for (let c = 1; c < cols; c++) d += `M${c} 0V${rows}`;
  for (let r = 1; r < rows; r++) d += `M0 ${r}H${cols}`;
  el('path', { class: 'grid', d }, svg);

  const fixed = el('g', { class: 'fixed' }, svg);
  for (const p of level.pillars) {
    el('rect', { class: 'pillar', x: p.c + 0.1, y: p.r + 0.1, width: 0.8, height: 0.8, rx: 0.12 }, fixed);
  }
  for (const slot of Object.values(level.slots)) {
    // Slots are deliberately uncolored: matching harmonics to temples is the party's job.
    const g = el('g', { class: 'slot', transform: `translate(${slot.c + 0.5} ${slot.r + 0.5})` }, fixed);
    el('circle', { class: 'slot-well', r: 0.36 }, g);
    el('circle', { class: 'slot-ring', r: 0.36 }, g);
  }

  const e = level.emitter;
  const emitter = el('g', { class: 'emitter', transform: `translate(${e.c + 0.5} ${e.r + 0.5})` }, fixed);
  el('circle', { r: 0.34, class: 'emitter-base' }, emitter);
  el('path', { d: 'M0 -0.28 L0.2 0.16 L-0.2 0.16 Z', class: 'emitter-crystal' }, emitter);

  const sp = level.splitter;
  const splitterSlot = el('g', { class: 'splitter-slot', transform: `translate(${sp.c + 0.5} ${sp.r + 0.5})` }, fixed);
  el('path', { d: PRISM_PATH, class: 'prism-slot' }, splitterSlot);

  const se = level.seal;
  const seal = el('g', { class: 'seal', transform: `translate(${se.c + 0.5} ${se.r + 0.5})` }, fixed);
  el('circle', { r: 0.4, class: 'seal-bloom' }, seal);
  el('circle', { r: 0.18, class: 'seal-core' }, seal);
  el('path', { d: 'M0 -0.42 A0.42 0.42 0 0 0 0 0.42 Z', class: 'seal-half seal-left' }, seal);
  el('path', { d: 'M0 -0.42 A0.42 0.42 0 0 1 0 0.42 Z', class: 'seal-half seal-right' }, seal);
  el('circle', { r: 0.42, class: 'seal-rim' }, seal);

  el('g', { class: 'beams' }, svg);
  el('g', { class: 'mirrors' }, svg);
  el('g', { class: 'pieces' }, svg);
  el('g', { class: 'solution' }, svg);

  div('layer sparks-layer', stack);

  // The bowl over the light, on top of everything so it can be clicked.
  // Positions are percentages of the stack, so it follows any resize.
  const bowl = div('bowl', stack);
  Object.assign(bowl.style, {
    left: `${(e.c / cols) * 100}%`, top: `${(e.r / rows) * 100}%`,
    width: `${100 / cols}%`, height: `${100 / rows}%`,
  });
  const shadow = el('svg', { class: 'bowl-shadow', viewBox: '-0.5 -0.5 1 1' }, bowl);
  el('ellipse', { cx: 0, cy: 0.3, rx: 0.46, ry: 0.1 }, shadow);
  const body = div('bowl-body', div('bowl-lift', bowl));
  const dome = el('svg', { viewBox: '-0.5 -0.5 1 1' }, body);
  el('path', { class: 'bowl-dome', d: 'M-0.44 0.24 A0.44 0.56 0 0 1 0.44 0.24 Z' }, dome);
  el('ellipse', { class: 'bowl-rim', cx: 0, cy: 0.24, rx: 0.47, ry: 0.08 }, dome);
  el('path', { class: 'bowl-shine', d: 'M-0.26 0.05 A0.3 0.4 0 0 1 -0.05 -0.24' }, dome);
  el('circle', { class: 'bowl-knob', cx: 0, cy: -0.36, r: 0.07 }, dome);

  return svg;
}

function mirrorShape(parent: Element, c: number, r: number, angle: number, cls: string) {
  const g = el('g', { class: cls, transform: `translate(${c + 0.5} ${r + 0.5}) rotate(${-22.5 * angle})` }, parent);
  el('line', { class: 'mirror-back', x1: -0.4, y1: 0.05, x2: 0.4, y2: 0.05 }, g);
  el('line', { class: 'mirror-face', x1: -0.4, y1: 0, x2: 0.4, y2: 0 }, g);
  return g;
}

export function drawDynamic(
  stack: HTMLElement, level: Level, s: TableState, result: TraceResult, opts: { showSolution?: boolean } = {},
) {
  const halos = stack.querySelector('.beams-halo')!;
  const beams = stack.querySelector('.beams')!;
  halos.innerHTML = '';
  beams.innerHTML = '';
  for (const g of result.segments) {
    const line = { x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2, pathLength: 1, stroke: COLOR_HEX[g.color] };
    el('line', { class: `beam-halo beam-${g.color}`, ...line, filter: 'url(#beam-glow)' }, halos);
    el('line', { class: `beam-core beam-${g.color}`, ...line }, beams);
  }

  drawImpacts(stack, level, result.impacts);

  const mirrors = stack.querySelector('.mirrors')!;
  mirrors.innerHTML = '';
  for (const [k, angle] of s.mirrors) {
    const [c, r] = k.split(',').map(Number);
    mirrorShape(mirrors, c, r, angle, 'mirror');
  }

  const pieces = stack.querySelector('.pieces')!;
  pieces.innerHTML = '';
  if (s.splitterPlaced) {
    const sp = level.splitter;
    const g = el('g', { class: 'splitter-piece', transform: `translate(${sp.c + 0.5} ${sp.r + 0.5})` }, pieces);
    el('path', { d: PRISM_PATH, class: 'prism' }, g);
  }
  for (const [color, slotName] of (Object.entries(s.harmonics) as [Color, string | null][])) {
    if (!slotName) continue;
    const slot = level.slots[slotName];
    el('circle', {
      class: `harmonic${result.lit[color] ? ' lit' : ''}`, 'data-color': color,
      cx: slot.c + 0.5, cy: slot.r + 0.5, r: 0.24, fill: COLOR_HEX[color],
    }, pieces);
  }

  let anyLit = false;
  for (const country of COUNTRIES) {
    const color = (Object.keys(s.harmonics) as Color[]).find((c) => s.harmonics[c] === country);
    const glow = stack.querySelector(`.glow-${country}`)!;
    const on = !!(color && result.lit[color]);
    if (on) glow.setAttribute('fill', COLOR_HEX[color]);
    glow.classList.toggle('on', on);
    anyLit = anyLit || on;
  }
  stack.classList.toggle('any-lit', anyLit);
  stack.classList.toggle('solved', result.solved);
  rejectAtSeal(stack, result.whiteHitsSeal);
  liftBowl(stack, s.lightUncovered);

  const solution = stack.querySelector('.solution')!;
  solution.innerHTML = '';
  if (opts.showSolution) {
    for (const m of level.solution) mirrorShape(solution, m.c, m.r, m.angle, 'ghost');
    for (const [color, slotName] of Object.entries(level.answer)) {
      const slot = level.slots[slotName];
      el('circle', { class: 'ghost-harmonic', cx: slot.c + 0.5, cy: slot.r + 0.5, r: 0.12, fill: COLOR_HEX[color] }, solution);
    }
  }
}

// Where a beam runs into something: a pool of its light (in the pulsing halo
// layer), with HTML sparks drifting back the way the beam came. Sizes and
// offsets are in cells, turned into lengths by CSS (1 cell = --cell). Spread
// and timing follow a fixed pattern so a redraw looks the same.
const SPARKS = 12;
const SPREAD = Math.PI * 1.4;
function drawImpacts(stack: HTMLElement, level: Level, impacts: TraceResult['impacts']) {
  const pools = stack.querySelector('.pools')!;
  const sparks = stack.querySelector('.sparks-layer')!;
  pools.innerHTML = '';
  sparks.innerHTML = '';
  for (const { color, x, y, dir } of impacts) {
    el('circle', { class: 'impact-pool', cx: x, cy: y, r: 0.28, fill: COLOR_HEX[color], filter: 'url(#beam-glow)' }, pools);
    const spot = div('impact', sparks);
    spot.style.left = `${(x / level.cols) * 100}%`;
    spot.style.top = `${(y / level.rows) * 100}%`;
    spot.style.color = COLOR_HEX[color];
    const back = Math.PI / 4 * ((dir + 4) % 8); // counter-clockwise from east
    for (let i = 0; i < SPARKS; i++) {
      const a = back + SPREAD * ((i / (SPARKS - 1)) - 0.5) + (i % 2 ? 0.12 : -0.12);
      const dist = 0.45 + 0.35 * ((i * 7) % 5) / 4;
      const spark = div('spark', spot);
      spark.style.cssText = `--dx:${(Math.cos(a) * dist).toFixed(3)}; --dy:${(-Math.sin(a) * dist).toFixed(3)};` +
        ` --size:${(0.1 + 0.04 * (i % 3)).toFixed(2)}; animation-delay:${((i * 0.37) % 1.6).toFixed(2)}s`;
    }
  }
}

// The bowl rises away and the white beam draws itself out, once, at the
// moment the party lifts it (not when a reload finds it already lifted).
let unveilTimer: ReturnType<typeof setTimeout>;
function liftBowl(stack: HTMLElement, uncovered: boolean) {
  const was = stack.dataset.uncovered;
  stack.dataset.uncovered = String(uncovered);
  stack.querySelector('.bowl')!.classList.toggle('lifted', uncovered);
  if (!(was === 'false' && uncovered)) return;
  stack.classList.add('unveil');
  clearTimeout(unveilTimer);
  unveilTimer = setTimeout(() => stack.classList.remove('unveil'), 2000);
}

// White light sent straight at the seal: shake and pulse red, once each
// time the beam newly arrives there.
let rejectTimer: ReturnType<typeof setTimeout>;
function rejectAtSeal(stack: HTMLElement, hit: boolean) {
  const was = stack.dataset.sealHit === 'true';
  stack.dataset.sealHit = String(hit);
  if (!hit || was) return;
  stack.classList.remove('rejected');
  stack.getBoundingClientRect(); // restart the animation
  stack.classList.add('rejected');
  clearTimeout(rejectTimer);
  rejectTimer = setTimeout(() => stack.classList.remove('rejected'), 1500);
}

export function cellFromEvent(svg: SVGSVGElement, evt: { clientX: number; clientY: number }): { c: number; r: number } | null {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
  const vb = svg.viewBox.baseVal;
  if (p.x < 0 || p.y < 0 || p.x >= vb.width || p.y >= vb.height) return null;
  return { c: Math.floor(p.x), r: Math.floor(p.y) };
}
