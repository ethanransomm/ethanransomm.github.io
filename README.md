# Ethan Ransom: portfolio

Live at https://ethanransomm.github.io/

My portfolio: two final-year projects, my toolkit, my background and how to reach me. It is a static site in plain HTML, CSS and vanilla JavaScript, with no framework and no build step. One config file drives the whole page.

The look is a dark terminal: powerline prompt headers for each section, a CRT texture, and a little ASCII artwork in the background.

## What is on it

- **Prostate cancer detection dashboard**: my dissertation. A Streamlit dashboard comparing nnU-Net, SwinUNETR and U-Net++ on the PI-CAI dataset, with interactive diagrams of each model and a gallery that includes the slice viewer.
- **Music Musings**: a Laravel music review platform, with its database schema drawn as an interactive diagram.
- **Toolkit**, **background** (education and work), what I am working on now, and contact links including my CV.

## Run it locally

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

then visit http://localhost:8000.

## How it is organised

| File | What it does |
| --- | --- |
| `config.js` | All the content: text, projects, toolkit, timeline, links, palette and fonts. Start here. |
| `index.html` | The page skeleton, section prompts, and the `<title>` and `<meta>` tags that power link previews. Keep those in step with `config.js`. |
| `main.js` | Renders every section from `config.js`, plus the diagrams, galleries and decorative layer. |
| `styles.css` | Layout, palettes and effects. Colour tokens are at the top. |
| `404.html` | The "page not found" page. Its links are absolute, so check them if the site is ever served from a sub-path. |
| `assets/` | Screenshots and the favicon. `cv.pdf` sits in the project root. |

## Editing content

Everything lives in `config.js`.

Each entry in `projects` is a short case study:

| Field | What it does |
| --- | --- |
| `context` | A small accented line above the title: module, grade, one-line framing. |
| `summary` | One or two sentences on what it is and who it is for. |
| `highlights` | The body of the card, as a few short bullets. |
| `feature` | `{ title, text, points }`: a titled block between the highlights and the result. The dashboard uses it for the slice viewer. |
| `outcome` | The closing block, shown under the heading "Result". |
| `image`, `imageAlt`, `imageFit`, `imageRatio` | The screenshot at the top of the card, in a window frame. |
| `gallery` | Extra screenshots or generated diagrams. Each is `{ src, alt, caption }`, or `{ graph, alt, caption }` for a drawn slide. |
| `diagram` | The name of an interactive model diagram defined in `main.js`. |
| `note` | A caveat in an accented callout. |
| `tech`, `links` | Technology pills and buttons. A link with an empty `url` is hidden. |

Other fields: `timeline` is the background section, `interests` is the "Outside of Programming" chips beside the About text, and `contact.links` holds GitHub, LinkedIn and the CV. Search `config.js` for `TODO` to find what is still unfilled (currently the dashboard's live demo link).

## Look and feel

**Palette.** `theme.palette` picks one of seven: `layer` (the one in use), `pine`, `vinyl`, `oxide`, `signal`, `cobalt`, `ember`. Each is a block of tokens in section 1 of `styles.css`. `theme.accent` overrides just the accent. The site is dark only, with no light mode. The three colours inside the model diagrams (violet, azure, rose) are fixed across palettes because they identify the three models.

**Typography.** JetBrains Mono throughout. The stack asks for the locally installed Nerd Font first and falls back to the Google build, so it looks the same for visitors without it.

**Section headers.** Each renders as a powerline prompt followed by a command naming the section. The chevrons are CSS triangles, not Nerd Font glyphs, so they never show as tofu. The written title stays in the markup as a visually hidden `<h2>` for screen readers. Edit the prompts in `index.html`.

**Decorative layer.** Everything here switches off under `prefers-reduced-motion`.

- A CRT texture: scanlines and vignette, film grain, and a faint chromatic aberration on the name.
- `initHeroArt()` draws a field of characters behind the name from interfering sine waves. Quiet cells are dots and the crests become hex digits.
- `initWires()` draws a band of utility poles and cable between the hero and the first section.
- `initEdgeArt()` draws a level meter down each margin on screens 1440px or wider. It drifts slowly on its own clock and never reacts to scrolling. It is clipped to start below the power lines. Set `edgeArt: false` in `config.js` to remove it, or lower `opacity` on `.edge-art` to quiet it.
- The easter egg is the Konami code.

## Diagrams and drawn slides

The dashboard has one tab per model, each with a **diagram** view and a **detail** view:

- **nnU-Net ensemble**: a wired schematic of five folds converging on a mean.
- **SwinUNETR**: tensor slabs, with the shifted window grid etched on one.
- **U-Net++**: a wired schematic of the dense skip pathways.

Nodes are focusable, and what an interaction reveals is announced through a live region, so everything works by keyboard and screen reader.

A gallery entry with `graph: "name"` is a generated drawing. Two exist in `GRAPHS` in `main.js`: `"mri-arch"` (the dashboard architecture) and `"mm-erd"` (the Music Musings schema). To add one, write another `*Spec()` function returning the same shape and register it in `GRAPHS`.

## Accessibility

Skip link, one `<h1>` with a clean heading outline, alt text on every image, keyboard access to interactive diagrams and galleries, and all real text passing WCAG AA contrast. The ASCII artwork is hidden from assistive technology.

## Pages and the status bar

The site is one HTML file shown a page at a time: about (with the masthead), projects, toolkit, background, now and contact. `PAGES` in `main.js` lists them, and a section the config leaves empty drops out.

The bar pinned to the top of the screen is the navigation, drawn like a tmux status line: a session name, one numbered window per page with a star on the current one, and a clock. On a phone the other windows collapse to their numbers. `statusBar` in `config.js` sets the session name and the text beside the clock.

- Press `1` to `6` to pick a page, or `n` and `p` for next and previous.
- Each page has its own address (`#projects` and so on), so links can be shared, a reload stays on the same page, and Back and Forward work.
- Every page ends with previous and next links.
- Switching moves focus to the new page's heading and updates the tab title, so screen readers announce the change. The fade between pages is off under `prefers-reduced-motion`.

The decorative initialisers run through `safely()`, so one of them failing is logged without breaking the paging.

## Deploying

Hosted on GitHub Pages from the `main` branch root of the `ethanransomm.github.io` repo. Any static host works: there is no build command, and the publish directory is `/`. Before sharing links widely, add an `og:image` tag in `index.html` (there is a commented example) so previews show a picture.
