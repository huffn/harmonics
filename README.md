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

```
npm run build
```

Copy the contents of `build/` to the NAS web root. The site is plain static files; nothing runs on the server and nothing is fetched from third parties.

Each puzzle is emitted as `light.html`, `heat.html`, etc. (not `heat/index.html`), so the web server must try `.html` for extensionless URLs. Any NAS web server that can do "try the path, then the path plus `.html`" works. Examples serving `build/` as the site root, with `/heat` and `/heat/` both reaching `heat.html`:

- `deploy/nginx.conf.example` (`try_files $uri $uri.html $uri/ =404;`)
- `deploy/Caddyfile.example` (`try_files {path} {path}.html {path}/` with `file_server`)

A trailing slash is redirected to the slash-less URL first, because `/heat/` would otherwise be looked up as an (index-less) directory. `npm run preview` is handy for a local check but is not identical to nginx or Caddy.
