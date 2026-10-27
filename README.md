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

The site is plain static files; nothing runs on the server and nothing is fetched from third parties.

1. On the dev machine: `npm run build`.
2. Copy the *contents* of `build/` (not the folder itself) to the NAS web root, so `index.html` sits at the root.

Each puzzle is emitted as `light.html`, `heat.html`, etc. (not `heat/index.html`), so the web server must try `.html` for extensionless URLs. Any NAS web server that can do "try the path, then the path plus `.html`" works. A trailing slash is redirected to the slash-less URL first, because `/heat/` would otherwise be looked up as an index-less directory.

### nginx or Caddy

- `deploy/nginx.conf.example`
- `deploy/Caddyfile.example`

Edit the `root` line to the folder you copied to. Both listen on port 8080; change as needed. To apply:

- nginx: put the file in `conf.d/` (or `include` it inside `http {}`), then `nginx -t && nginx -s reload`.
- Caddy: `caddy run --config deploy/Caddyfile.example --adapter caddyfile`, or copy it to your Caddyfile and `caddy reload`.

### NAS with only a built-in web server (Apache)

Synology Web Station, QNAP and similar are often Apache-based. Put this `.htaccess` in the web root (needs `mod_rewrite` and `AllowOverride All`):

```
RewriteEngine On
# /heat/ -> /heat
RewriteRule ^(.+)/$ /$1 [R=308,L]
# /heat -> heat.html when it exists
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME}.html -f
RewriteRule ^(.*)$ $1.html [L]
```

If the server can do none of this, the puzzles still load at their `.html` names: `/light.html`, `/rhythm.html`, `/heat.html`, `/wind.html`, `/memory.html`.

### Smoke test after deploying

Open `/`, then each puzzle path (`/light`, `/rhythm`, `/heat`, `/wind`, `/memory`). Refresh one of them (it should still load, not 404). Try `/heat/`; it should land on `/heat`. `npm run preview` is handy for a local check but is not identical to nginx or Caddy.
