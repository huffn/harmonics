# The Harmonics puzzle site

A static SvelteKit site hosting tabletop-RPG puzzles for the GM's shared screen.

## Develop

```
npm install
npm run dev
```

## Test

```
npm test
npm run check
```

## Build

```
npm run build
```

Output goes to `build/`.

## GM keys

Hidden; there is no on-screen hint.

| Keys | What it does |
|---|---|
| `Alt+Shift+N` | Advance the current puzzle (no-op on Light, which has a single level) |
| `Alt+Shift+R` | Reset the current puzzle (on Light: full restart, back to the covered bowl, harmonics hidden) |
| `Alt+Shift+S` | Light: show or hide the solution (faint dashed mirrors, plus a faint dot of the intended color in each temple) |
| Type `harmonic` | Light: reveal the Harmonics and Awakened panels |

## Deploy

TBD.
