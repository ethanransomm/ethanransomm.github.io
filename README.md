# Portfolio skeleton

A small portfolio site with no build step. One config file drives the whole page, so there is nothing to install or build.

## Run it

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

then visit http://localhost:8000.

## What to edit

| File | What it controls |
| --- | --- |
| `config.js` | All your content, accent colour and fonts. Start here. |
| `index.html` | The `<title>` and `<meta>` tags (these power link previews, so keep them in step with `config.js`). |
| `styles.css` | Layout and look. Colour variables are at the top. |
| `404.html` | The "page not found" page. Give it a joke. |
| `assets/` | Your photo, project screenshots, CV and favicon. |

Search `config.js` for `TODO` to find the few fields still waiting on you.

## Project fields

Each entry in `projects` is a short case study. Beyond the usual
`title` / `summary` / `role` / `problem` / `approach` / `outcome` / `learned`:

| Field | What it does |
| --- | --- |
| `context` | A small accented line above the title. Module code, grade, the one-line framing. |
| `summary` | One or two sentences. What it is and who it is for. |
| `highlights` | The body of the card, as three or four short bullets. Keep it to bullets; this replaced five long paragraphs and the card got much easier to read. |
| `outcome` | A short closing block under a rule. What happened, and what you would change. |
| `image`, `imageAlt` | The screenshot at the top of the card. Gets a window frame, so a dark UI still reads as a screenshot. |
| `gallery` | A scrollable strip of extra screenshots under the summary. Each is `{ src, alt, caption }`; clicking one opens a lightbox. |
| `diagram` | The name of an interactive diagram defined in `main.js` (`"cspca"` draws the three model architectures). Used *instead of* `image`. |
| `note` | A short caveat in an accented callout, disclaimers, scope limits. |
| `tech`, `links` | Technology pills and buttons. A link with an empty `url` is hidden. |

## Colour palettes

`theme.palette` in `config.js` picks one of seven: `layer`, `pine`, `vinyl`,
`oxide`, `signal`, `cobalt`, `ember`. Each is one block of tokens in section 1
of `styles.css`; copy a block, give it a new `data-palette` name, and point
`theme.palette` at it. `theme.accent` overrides just the accent of whichever
palette is selected.

**The site is dark only.** There is no light mode and no theme toggle. A
bleached version of this design was a different design wearing the same
markup, so the light tokens and the three mapping blocks that switched
between them are gone; each palette now sets the live tokens directly.

Every palette carries a `--sage` secondary for the metadata layer: section
numbers, the eyebrow rule, project context lines, stat suffixes, timeline
places and the prompt separators.

The three colours inside the model diagrams (violet, azure, rose) stay fixed
across every palette. They identify nnU-Net, SwinUNETR and U-Net++, so they
are data colours rather than brand colours, and they deliberately avoid every
accent hue.

## Typography

The site is set in JetBrains Mono throughout. The stack in `styles.css` asks
for the locally installed Nerd Font patch first and falls back to the
metrically identical Google build, so the page looks the same for visitors who
do not have it. `theme.fontBody` / `fontHeading` / `fontDisplay` in `config.js`
override that stack when set; leave them as `""` to use it.

## Section headers

Each one renders as a line of the terminal: a powerline prompt (Arch logo
segment, working directory segment, chevrons) followed by a command that
names what the section is. The written title is still in the markup as a
visually hidden `<h2>`, because it is the section's accessible name and what
a screen reader announces. The chevrons are CSS triangles rather than the
Nerd Font separator glyph, which would be tofu for anyone without the
patched font installed.

Edit the prompts directly in `index.html`. `pacman -Qe` assumes Arch; swap it
if that stops being true.

## The CRT layer

Four static overlays give the page its texture, none of which animate:
`body::before` carries scanlines and a vignette,
`body::after` carries film grain, the masthead has a permanent chromatic
aberration via `text-shadow`, and `initWires()` draws a band of utility poles
and cable between the hero and the first section. Reticle corners mark the
"device" surfaces: the diagram panels, the project screenshot frames, the
toolkit cells and the interest chips.

## The decorative layer

Everything here switches off under `prefers-reduced-motion`:

- `initHeroArt()` in `main.js` draws the field of characters behind the
  masthead. Several sine waves interfere and the result is drawn as data:
  quiet cells are dots, busier ones punctuation, and the crests become hex
  digits. The glyph at a given cell never changes, only how bright it is, so
  it moves without flickering. The grid is sized to its box from the real glyph
  width, so it fits at any viewport, and it is dropped below 900px. It fades
  toward the name and toward the power lines.
- The name is split into one `<span class="ch">` per character so it can fade
  in a letter at a time. Nothing moves, only opacity.
- Section rules draw themselves left to right when the header scrolls in,
  driven by the same `.in` class the reveal observer sets.

A film grain sits over everything via `body::after`. Drop its opacity to 0 to
remove it.

## The side rails

On screens at least 1440px wide, a level meter runs down each margin: rows of
bars reaching in from the outer edge, ending in a hex digit. `initEdgeArt()`
in `main.js` draws it; `meterFrame()` builds one frame. It drifts on its own
clock (0.06 phase units a second, redrawn four times a second, paused while the
tab is hidden), so it never reacts to scrolling. Below 1440px there is no room
and the rails are not shown. Under `prefers-reduced-motion` it draws once and
stays still. It is fixed behind the content, fades toward the text, and is
hidden from assistive technology and from print.

The rails are clipped to start just below the power lines (`--rail-clip`, set
from script), so the two never overlap; once the lines have scrolled away the
clip is zero.

Set `edgeArt: false` in `config.js` to remove it. To make it quieter, lower
`opacity` on `.edge-art` in `styles.css`, or shorten the bars by reducing the
`0.62` in `meterFrame()`.

## Reload and navigation

A refresh always starts at the top. `history.scrollRestoration` is set to
`manual` in the page head, in-page links scroll without writing a `#section`
to the address bar, and `restoreHashTarget()` clears a stale `#section` on a
reload (a typed or shared link to a section still lands on it). Scrolling to
the top uses `jump()`, which switches off `scroll-behavior: smooth` for the
move so it cannot animate from a restored position. Navigation and this
start-of-page handling are initialised before any decoration, and the
decorative initialisers run through `safely()`, so one of them throwing is
logged instead of disabling the nav.

## The About block

The facts and the numbers share one block that reads like system-info output:
an Arch logo, an `ethan@bristol` line (`about.prompt`), then key and value
rows. `about.facts` supply the first rows and `stats` the rest. Each stat is
`{ key, value, decimals, prefix, suffix, label }`: `key` is the left-hand name,
`label` the muted text after the number. The numbers scramble and count up the
first time the block is seen, and the scramble preserves digit count and
separators so nothing reflows. The rows are a real description list; the logo
and the prompt line are hidden from assistive technology.

## Drawn slides and the feature block

A gallery entry can be a generated diagram instead of a screenshot: give it
`graph: "name"`, a `caption` and an `alt` (which becomes the drawing's
accessible description). Two exist, defined in `main.js` as `GRAPHS`:
`"mri-arch"` (the dashboard's architecture) and `"mm-erd"` (the Music Musings
database schema). Each is a small spec: `build()` returns the SVG, and
`neighbours()` and `describe()` drive the hover readout. Hover, tab to or click
a component and what it touches lights up while the rest recedes; the readout
sentence appears in the caption line, which is a live region. The thumbnail is
a miniature of the same drawing, hidden from assistive technology and from the
tab order.

To add one, write another `*Spec()` function returning that shape and register
it in `GRAPHS`. Edge routes in the schema are explicit polylines so the
relationship lines stay orthogonal.

`feature: { title, text, points }` on a project adds a titled block between its
highlights and its outcome. The dashboard uses it for the slice viewer.

## Diagrams

Three models, three drawings, each chosen for what the model is about:

- **nnU-Net ensemble**: a wired schematic. Five signal lines, each from a
  different held-out block, converge on one mean node.
- **SwinUNETR**: tensor slabs. Footprint shrinks and thickness grows down the
  encoder, and one slab has the 8x8 window grid etched on it, which shifts by
  half a window on layer l+1.
- **U-Net++**: a wired schematic of the dense skip pathways. Every earlier map
  on a row feeds each node, not just its neighbour.

Every tab has two views. **Diagram** is the drawing; **detail** is printed
output answering the question the drawing only implies (the fold table, the
28-patch count, the full ancestry tree for a node).

In `main.js` each tab supplies `diagram(uid, say)` and `detail(uid, say)`,
which return `{ el, controls, idle }`. `say(text)` writes to the panel's
`role="status"` live region, so what an interaction reveals is announced
rather than being colour-only. Wired connections pulse via the `dg-wire`
class and slabs are drawn by `slab()`; both switch their motion off under
`prefers-reduced-motion`. Nodes are focusable, so everything is reachable by
keyboard, not only by hover.

Each panel sets `--m` (violet, azure, rose), which is the only colour the
drawings use besides the neutrals.

## First pass checklist

1. Fill in `name`, `role`, `tagline` and the About text in `config.js`.
2. Write your projects as case studies: role, problem, approach, outcome, what you would change.
3. Add screenshots to `assets/` and point each project's `image` and `gallery` at them (with alt text).
4. Add the GitHub, LinkedIn and email links.
5. Pick a palette (`theme.palette`), or override just its accent with `theme.accent`.
6. Replace `assets/favicon.svg` with your own, and update the `<title>` and `<meta>` tags in `index.html`.
7. Try it on your phone.

## Making it yours

- Write the copy in your own voice. This does more than any design change.
- Use your own images instead of stock ones.
- Add a section: open `main.js`, add a `render...` function next to the others and call it at the bottom.
- Try the Konami code on the page (up up down down left right left right b a).

## Deploy for free

Any static host works. Push this folder to a GitHub repo, then:

- **GitHub Pages**: repo Settings, Pages, deploy from the `main` branch root.
- **Netlify or Cloudflare Pages**: import the repo; leave the build command empty and set the publish directory to `/`.
- **Vercel**: import the repo with the "Other" framework preset and no build command.

Add a custom domain in the host's settings once it is live. If you serve from a sub-path (for example `username.github.io/repo/`), update the home link in `404.html`.
