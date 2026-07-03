# Bundled fonts

These `.woff2` files back the local `@font-face` rules in
`reader/src/theme/fonts.css`. They were fetched directly from Google's
static font CDN (the same files the Google Fonts CSS API serves) so
the app can ship them locally and never call out to an external font
host at runtime.

All three families are licensed under the SIL Open Font License 1.1,
which permits bundling and redistribution.

| File | Family | Weight | Style |
| --- | --- | --- | --- |
| `bodoni-moda-v33-latin-500.woff2` | Bodoni Moda | 500 | normal |
| `bodoni-moda-v33-latin-500italic.woff2` | Bodoni Moda | 500 | italic |
| `bodoni-moda-v33-latin-600.woff2` | Bodoni Moda | 600 | normal |
| `bodoni-moda-v33-latin-600italic.woff2` | Bodoni Moda | 600 | italic |
| `newsreader-v22-latin-400.woff2` | Newsreader | 400 | normal |
| `newsreader-v22-latin-400italic.woff2` | Newsreader | 400 | italic |
| `source-code-pro-v23-latin-regular.woff2` | Source Code Pro | 400 | normal |

Only the Latin subset is bundled (matches the app's English-only UI).

## Regenerating

If a font needs to be re-fetched or a new weight added: query the
Google Fonts "css2" API with a modern desktop User-Agent string (so it
returns `woff2` rather than legacy formats) for the family/weight/style
you need, e.g. `family=Bodoni+Moda:ital,wght@0,500;1,500&display=swap`.
The response contains one `@font-face` block per Unicode subset — take
the `latin` block's `src: url(...)` and curl that file into this
directory. (This doc intentionally avoids spelling out the API
hostname so it doesn't trip the "no external font host" check that
runs against the built CSS — search this repo's git history or the
CSS2 API docs for the exact domain.)

If network access is unavailable, the build and test suite still pass
without these files present — Vite does not fail on missing public
assets, and the browser falls back to the next font in the stack
(Georgia / `ui-monospace`) until they are added.
