# Table of Light: the ancient map and the converging finale

## Intent

The Table of Light now shows the world as it was hundreds of years ago. When the
party solves it, the light that opened the Radiant Seat travels on to a stone-circle
marking that appears on the table, showing the party where the story goes next.

## What changes

1. **Map.** The greyscale map is replaced by the GM's ancient map
   (`Fabula 2026-11-19-12-24.jpeg`, 1674×971), the version *without* the marking.
   It is stretched to the board (about 3% squash, invisible in play). The coastlines
   match the old map, so the country glow masks, temple slots, pillars, emitter
   and seal all stay where they are. The only change in geography is the land that
   now fills the gap between The Broken and Savawell Thicket.
2. **Finale (approach A).** The existing solve sequence is unchanged: the four harmonics
   light, the Radiant Seat glows, the seal splits open (this is the fifth harmonic unlocking),
   and the table shakes. After that:
   - Every beam path on the board fades out.
   - Five straight beams shoot to the marking: white from the seal, and one from each
     lit harmonic in its own color. They hold, shimmering.
   - The marking fades in at its true spot (pixel box 764,554 to 851,634 on the
     1674×971 map, centered in cell (12,9)) and keeps pulsing with light.
3. **Marking art.** Cut from the GM's marked map (`AC S14 Map Table.jpeg`) as its own
   image, so the art is exact, and drawn as a separate layer that fades in.

## Behavior rules

- The convergence plays once, at the moment of solving. A reload of a solved table
  shows the end state with no replay, like the bowl does today.
- Once the table is solved, any change that unsolves it (lifting a harmonic or mirror,
  Reset) puts the normal beams back and hides the marking.
- The reduced-motion setting skips the travel animation and shows the end state.
- The GM's solution overlay (Alt+Shift+S) is unchanged.

## Approaches considered

- **A. Straight beams to the mark (picked).** Easy to read at a glance, since everything
  is drawn to one point, and cheap to build on the existing layers.
- B. Light flows back along the paths the players built. It feels more earned, but it's
  much harder to build and the paths double back across the table, so it can look tangled.
- C. No new beams: the light dims and a ring collapses onto the mark. Cleanest look, but
  it loses the sense of light traveling to the mark.

## Non-goals

- No change to the puzzle itself: same slots, pillars, solution and mirror count.
- The country masks are rebuilt only to crop them to the ancient map's shape (it is the old map with the bottom ~2.6% trimmed); their outlines are unchanged.

## Left to the builder

- Timings and easing of the fade, travel and pulse, chosen to follow on from the existing
  quake (which ends about 4.1s after the solve).
- How the source images are stored: either the build script gains an ancient-map mode
  or the two assets are produced once and committed.
- Keeping the animation cheap in Safari: put the new beams and the marking in their own
  layers that only fade or move as a whole, as `render.ts` already does for other effects.
