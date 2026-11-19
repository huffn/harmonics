# Table of Light: Ancient Map and Converging Finale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swap the Table of Light's greyscale map for the ancient map, and after the solve quake, have every light on the table converge on a stone-circle marking that fades in and pulses.

**Architecture:** A one-off sharp script turns the GM's two JPEGs into `map-ancient.jpg` and a transparent `mark.png`. A pure `convergeBeams(level, s, result)` in a new `finale.ts` computes the five straight beams. `render.ts` gains two layers (the marking under the board, the converging beams over it) that only fade or pulse as a whole, and `light.css` sequences them after the existing quake.

**Tech Stack:** SvelteKit, TypeScript, SVG layers, CSS animations, sharp, vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-light-ancient-map-design.md`

## Global Constraints

- No puzzle changes: slots, pillars, emitter, splitter, seal, solution and `MAX_MIRRORS = 10` stay exactly as they are; the existing country masks are reused unchanged.
- Marking pixel box on the 1674×971 map: x 764 to 851, y 554 to 634. In board units (25×15) that is `x 11.41, y 8.56, width 1.31, height 1.25`, centered at about (12.06, 9.18), inside cell (12,9).
- The existing finale (radiant glow, bloom, seal opening, quake that ends about 4.1s after solving) is unchanged; the new sequence starts after it.
- New animated layers only fade, pulse or move as a whole (the Safari CPU rule at the top of `render.ts`).
- The source JPEGs live in git-ignored `tools/light/source/`; the generated assets are committed.

## Review Focus

- **Reload on a solved table:** the end state (mark visible, converge beams shown, normal beams hidden) appears with no replay of the convergence. Checked by hand in Task 3.
- **Unsolving after the finale** (lifting a mirror or harmonic, Reset, GM full reset): the converge beams and the marking go away at once, and the normal beams return. `convergeBeams` returning `[]` is tested in Task 2; the visuals are checked by hand in Task 3.
- **Harmonics solved in slots other than `level.answer`:** the converge beams start from where each harmonic actually sits. Tested in Task 2.
- **Reduced motion:** the end state appears without the travel or pulse animation. Checked by hand in Task 3.
- **Re-solving after an unsolve:** the convergence plays again (it is not stuck in "already played" mode). Checked by hand in Task 3.

---

### Task 1: Ancient map and marking assets

**Files:**
- Create: `tools/light/build-ancient.mjs`
- Modify: `tools/light/build-assets.mjs` (stop writing `map-grey.jpg`; drop the scale-bar patch and its constants, since nothing else uses them; update the header comment)
- Modify: `package.json` (add a `build:light-ancient` script)
- Modify: `src/lib/light/level.ts` (add `mark`)
- Modify: `src/lib/light/render.ts` (map href)
- Delete: `static/light/assets/map-grey.jpg`
- Create: `static/light/assets/map-ancient.jpg`, `static/light/assets/mark.png`
- Test: `tests/light/level.test.ts`

**Interfaces:**
- Produces: `Level.mark: { x: number; y: number; width: number; height: number }`, the marking's box in board units. `level.mark = { x: 11.41, y: 8.56, width: 1.31, height: 1.25 }`.
- Produces: assets `light/assets/map-ancient.jpg` (the plain ancient map) and `light/assets/mark.png` (the marking only, transparent elsewhere, cropped to exactly the box above).

- [ ] **Step 1: Copy the sources into the ignored folder**

```bash
cp ~/Downloads/"Fabula 2026-11-19-12-24.jpeg" tools/light/source/ancient-map.jpg
cp ~/Downloads/"AC S14 Map Table.jpeg" tools/light/source/ancient-map-marked.jpg
```

- [ ] **Step 2: Write the failing tests** in `tests/light/level.test.ts`

```ts
test('the marking sits in cell (12,9), straight below the seal', () => {
  const cx = level.mark.x + level.mark.width / 2;
  const cy = level.mark.y + level.mark.height / 2;
  expect(Math.floor(cx)).toBe(12);
  expect(Math.floor(cy)).toBe(9);
  expect(Math.floor(cx)).toBe(level.seal.c);
});

test('the marking art matches its box', async () => {
  const file = path.resolve('static/light/assets/mark.png');
  const { width, height, hasAlpha } = await sharp(file).metadata();
  expect(hasAlpha).toBe(true);
  // The 1674×971 map is stretched onto the 25×15 board.
  expect(width! / 1674 * 25).toBeCloseTo(level.mark.width, 1);
  expect(height! / 971 * 15).toBeCloseTo(level.mark.height, 1);
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run: `npx vitest run tests/light/level.test.ts`
Expected: FAIL (`level.mark` is undefined, `mark.png` is missing).

- [ ] **Step 4: Write `tools/light/build-ancient.mjs`**

It reads `tools/light/source/ancient-map.jpg` and `ancient-map-marked.jpg` (or paths passed as argv[2] and argv[3]) and writes:
- `static/light/assets/map-ancient.jpg`: the plain map unchanged in size, JPEG quality 85.
- `static/light/assets/mark.png`: the marked map cropped to the box `{ left: 764, top: 554, width: 88, height: 81 }`. Alpha per pixel is the max channel difference from the plain map, scaled so a difference of 4% or less is fully transparent and 25% or more is fully opaque. This keeps only the marking's ink and drops the identical parchment behind it.
- It logs the box in board units (`x = left / 1674 * 25`, and so on) so `level.mark` can be checked against it.

Add `"build:light-ancient": "node tools/light/build-ancient.mjs"` to `package.json`.

- [ ] **Step 5: Run it and look at the result**

Run: `npm run build:light-ancient`
Expected: it logs a box of `x 11.41, y 8.56, width 1.31, height 1.25`. Open `mark.png`: the compass circle and its ring of glyphs, with no parchment rectangle.

- [ ] **Step 6: Add `mark` to `Level` and `level`, point the map at `map-ancient.jpg`, delete `map-grey.jpg`, and stop `build-assets.mjs` from writing it**

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: PASS. The existing `masks.test.ts` and solver tests are unaffected.

- [ ] **Step 8: Commit**

```bash
git add tools/light package.json src/lib/light/level.ts src/lib/light/render.ts static/light/assets tests/light/level.test.ts docs/superpowers
git commit -m "feat(light): the ancient map replaces the greyscale one"
```

---

### Task 2: The converging beams

**Files:**
- Create: `src/lib/light/finale.ts`
- Test: `tests/light/finale.test.ts`

**Interfaces:**
- Consumes: `Level.mark` (Task 1); `TraceResult`, `Segment` from `trace.ts`; `TableState`.
- Produces: `convergeBeams(level: Level, s: TableState, result: TraceResult): Segment[]`. It returns `[]` unless `result.solved`. Otherwise it returns five segments, all ending at the mark's center: first `white` from the seal's cell center, then one per color in `COLORS` order, each starting from the center of the slot that color actually sits in (`level.slots[s.harmonics[color]]`).

- [ ] **Step 1: Write the failing tests** (reuse the `solvedState` helper pattern from `level.test.ts`)

```ts
test('no converging beams until solved', () => {
  const s = solvedState(level.solution, ['green', 'red', 'yellow']);
  expect(convergeBeams(level, s, trace(level, s))).toEqual([]);
});

test('five beams end on the marking: white from the seal, each color from its harmonic', () => {
  const s = solvedState();
  const beams = convergeBeams(level, s, trace(level, s));
  const mx = level.mark.x + level.mark.width / 2;
  const my = level.mark.y + level.mark.height / 2;
  expect(beams.map((b) => b.color)).toEqual(['white', 'green', 'red', 'yellow', 'blue']);
  for (const b of beams) expect([b.x2, b.y2]).toEqual([mx, my]);
  expect([beams[0].x1, beams[0].y1]).toEqual([12.5, 1.5]); // the seal
  expect([beams[1].x1, beams[1].y1]).toEqual([3.5, 4.5]); // green in Dhruv
});

test('beams start wherever the harmonics actually sit', () => {
  const s = solvedState();
  const result = { ...trace(level, s), solved: true };
  s.harmonics.green = 'volund';
  s.harmonics.blue = 'dhruv';
  const beams = convergeBeams(level, s, result);
  expect([beams[1].x1, beams[1].y1]).toEqual([23.5, 2.5]); // green, now in Volund
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run tests/light/finale.test.ts`
Expected: FAIL (the module is not found).

- [ ] **Step 3: Implement `convergeBeams` in `src/lib/light/finale.ts`**

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run tests/light/finale.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/light/finale.ts tests/light/finale.test.ts
git commit -m "feat(light): beams that converge on the marking"
```

---

### Task 3: Drawing and sequencing the finale

**Files:**
- Modify: `src/lib/light/render.ts`
- Modify: `src/lib/light/light.css`
- Modify: `src/lib/light/ui.ts` (pass the converge beams into `drawDynamic`)

**Interfaces:**
- Consumes: `convergeBeams` (Task 2), `level.mark` (Task 1).
- Produces: the layer order becomes map, **mark**, glow, halo, board, **converge**, sparks, bowl. `drawDynamic`'s `opts` gains `converge: Segment[]`, and `ui.ts` passes `convergeBeams(level, s, result)`.

- [ ] **Step 1: Add the layers in `createBoard`**

- `layer-mark` (class `mark-layer`), right after the map. It holds a `mark-glow` circle filled with the existing `#bloom` gradient, centered on the mark, radius about 1.1, and on top of it the `mark.png` image at `level.mark`'s box with class `map` so it gets the same filter as the map. The layer starts at opacity 0.
- `layer-converge` (class `converge-layer`, `pointer-events: none`), right after the board layer. It holds a `converge-halo` group (lines with `filter: url(#beam-glow)`) and a `converge-core` group, styled like `.beam-halo` and `.beam-core`.

- [ ] **Step 2: Draw the converge beams and mark the replay state in `drawDynamic`**

Redraw both converge groups from `opts.converge` each call, giving lines `pathLength: 1`, the same way the normal beams are drawn. Then track the previous solved state, the way `liftBowl` tracks the bowl: when the stack's first draw is already solved (`stack.dataset.solved` is unset and `result.solved` is true), add the class `finale-settled`. Remove that class whenever the board is unsolved, so a later re-solve plays the convergence again.

- [ ] **Step 3: Sequence it in `light.css`**

Delays are counted from the moment of solving, and apply only on the way in, matching the existing finale's convention:
- At 4.2s, `.solved .beams`, `.solved .beams-halo`, `.solved .pools` and `.solved .sparks-layer` fade to opacity 0 over 0.8s.
- From 4.6s, the converge lines draw out with `stroke-dasharray: 1` and `stroke-dashoffset` going from 1 to 0 over 1.2s.
- At 5.4s, `.mark-layer` fades in over 1.4s.
- From 6.8s, `.mark-glow` and the converge halo pulse forever (opacity 1 to about 0.55, a 2.4s cycle, staggered so the halo doesn't pulse in lockstep with the glow). The animations go on these elements' own groups, not the busy board.
- `.finale-settled` zeroes every delay and duration above and skips the draw-out, so a reload shows the end state at once.
- Under `prefers-reduced-motion`, behave like `.finale-settled` and also drop the pulse, leaving the glow at a steady medium opacity.
- When the board is not solved, the converge layer and the mark layer are at opacity 0 with no delay.

- [ ] **Step 4: Type-check and run the tests**

Run: `npm run check && npm test`
Expected: 0 errors, all pass.

- [ ] **Step 5: Check it in the browser** (`npm run dev`, then open `/light`)

1. Lift the bowl, type `harmonic`, toggle the solution overlay (Alt+Shift+S) and place the solution. Expect the quake, then the beams fading, five beams racing to cell (12,9), the marking fading in, and a steady pulse.
2. Reload. Expect the end state with no replay.
3. Lift one mirror (right-click). Expect the marking and converge beams gone at once, and the normal beams back.
4. Put it back. Expect the full convergence to play again.
5. Turn on reduced motion in the OS. Expect the end state with no animation.
6. Shift-click Reset. Expect a clean table on the ancient map.

- [ ] **Step 6: Commit**

```bash
git add src/lib/light/render.ts src/lib/light/light.css src/lib/light/ui.ts
git commit -m "feat(light): after the quake, the light converges on the marking"
```
