# Ethan Ransom: portfolio

Live at https://ethanransomm.github.io/

My portfolio: two final-year projects, my toolkit, my background and how to reach me. It is built with [Astro](https://astro.build), so every page is plain HTML by the time it reaches a browser, and very little script is sent with it.

The look is a dark terminal: a tmux-style status bar for navigation, powerline prompt headers for each section, a CRT texture, and a band of ASCII artwork over a row of power lines.

## What is on it

- **Home**: who I am and what I am looking for, beside the scans and headline result from my dissertation, then a short About.
- **Projects**: an index, and a page for each project.
  - **Prostate cancer detection dashboard**, my dissertation: a Streamlit dashboard comparing nnU-Net, SwinUNETR and U-Net++ on the PI-CAI dataset, with a screenshot gallery and an interactive diagram of each model.
  - **Music Musings**: a Laravel music review platform, with its database schema drawn as an interactive diagram.
- **Toolkit**, **Background** (education and work) and **Contact**, which also says what I am working on now.

## Run it locally

You need Node 22.23.4 or later.

```
npm install
npm run dev
```

Then open the address it prints, usually http://localhost:4321.

| Command | What it does |
| --- | --- |
| `npm run dev` | Serves the site and reloads as you edit. |
| `npm run build` | Type-checks, then builds the site into `dist/`. |
| `npm run preview` | Serves the built `dist/` folder, as the live site would. |
| `npm run check` | Type-checks without building. |

## How it is organised

| Path | What is in it |
| --- | --- |
| `src/data/site.ts` | Name, summary, links, the list of pages and the About text. Start here. |
| `src/data/` | The toolkit, the background timeline, the "right now" section and the icons. |
| `src/content/projects/` | One file per project: its facts in the header, its write-up underneath. |
| `src/content.config.ts` | The shape a project file must have. The build stops if a file does not match. |
| `src/assets/projects/` | Screenshots. They are resized and compressed when the site is built. |
| `src/layouts/Base.astro` | The frame every page sits in: head tags, status bar, pager, footer. |
| `src/components/` | The pieces pages are made from. |
| `src/pages/` | One file per page. The folder structure is the site's addresses. |
| `src/scripts/` | The ASCII artwork (`field.ts`) and the interactive drawings (`diagrams.js`). |
| `src/styles/` | Colours and tokens, base styles, the Tailwind setup, and the drawings' styles. |
| `public/` | Files served as they are: the favicon, `cv.pdf`, the link-preview picture, `robots.txt`. |
| `.github/workflows/deploy.yml` | Builds and publishes the site on every push to `main`. |

## Editing content

Most text lives in `src/data/site.ts` and the other files in `src/data/`. Each one explains its own fields in comments.

A project is a file in `src/content/projects/`. Its name is its address, so `music-musingsv2.mdx` is served at `/projects/music-musingsv2/`. The header holds the facts:

| Field | What it does |
| --- | --- |
| `title`, `order` | The name, and where it sits on the projects page (lowest first). |
| `context` | A small line under the title: module, grade, one-line framing. |
| `summary` | One or two sentences on what it is and who it is for. |
| `repo` | The repository as `owner/name`. It titles the screenshot window. |
| `links` | Buttons. A link with an empty `url` stays hidden until it has one. |
| `ratio`, `shots` | The gallery. Each slide is a screenshot (`image`) or a drawn graph (`graph`), with its `alt` text, `caption` and a short thumbnail `label`. |
| `results` | Headline numbers, drawn as bars. `tone` picks one of the model colours. |
| `tech` | Technology chips. |
| `note` | A caveat, shown in an accented callout. |
| `diagram` | The interactive model diagram to show after the write-up. |

Under the header is the write-up. The opening list is the body of the page, as short paragraphs. Each `##` heading after it starts a titled block, and "Result" closes the page.

To add a project, add a file there and put its screenshots in `src/assets/projects/`.

The home page takes its picture and result bars from the dissertation's project file. The picture is a crop of the four scan panels from the slice-viewer screenshot (`prostate-slice-viewer-scans.webp`); remake the crop if that screenshot is replaced. The four facts under it are listed in `src/components/Hero.astro`.

Search the project files for `url: ""` to find links that are still unfilled (currently the dashboard's live demo).

## Look and feel

**Palette.** `src/styles/palettes.css` holds seven: `layer` (the one in use), `pine`, `vinyl`, `oxide`, `signal`, `cobalt` and `ember`. To use another, add `data-palette="pine"` to the `<html>` tag in `src/layouts/Base.astro`. The site is dark only. The three colours inside the charts and model diagrams (violet, azure, rose) are fixed across palettes, because they identify the three models.

**Typography.** JetBrains Mono for headings, labels, the status bar and figures; IBM Plex Sans for anything read at length. Both are bundled with the site, so nothing is fetched from a font service. All text uses one of five sizes, `--fs-xs` to `--fs-lg`, defined in `src/styles/global.css`; use those instead of writing a new size. The display headings scale with the window, and the ASCII artwork and the lettering inside the diagrams keep their own sizes.

**Styling.** Older components carry their own styles in a `<style>` block. Newer ones, starting with the home page's hero, use Tailwind utility classes. Both read the same colours and sizes; `src/styles/tailwind.css` maps them to Tailwind's names (`bg-surface`, `text-accent`, `text-sm`). Tailwind's base reset is left out, so a border needs its style as well as its width: write `border border-solid`.

**Section headers.** Each is a powerline prompt followed by a command naming the section, then the written title. The chevrons are CSS triangles, not Nerd Font glyphs, so they never show as empty boxes. The prompt is decoration; the title is the real heading.

**Decorative layer.** All of it is static under `prefers-reduced-motion`.

- A CRT texture: film grain and a vignette over the page, scanlines on the masthead, the ASCII band and the power lines, and a faint colour misregistration on the name.
- The ASCII field (`src/scripts/field.ts`) is drawn from interfering sine waves: quiet cells are dots and the crests become hex digits. It sits as a band of sky above the power lines on the home page. One frame is drawn when the site is built, so it is there without script; the script animates it, and a pause button stops it.
- The power lines (`src/components/Wires.astro`) are drawn when the site is built and need no script.

## Diagrams and drawn slides

The dashboard's page has one tab per model, each with a diagram view and a detail view:

- **nnU-Net ensemble**: a wired schematic of five folds converging on a mean.
- **SwinUNETR**: tensor slabs, with the shifted window grid etched on one.
- **U-Net++**: a wired schematic of the dense skip pathways.

The diagram is built as the reader scrolls towards it. Until then, and without script, the same facts are on the page as text.

A gallery slide with `graph: name` is a drawing, not a screenshot. Two exist in `GRAPHS` in `src/scripts/diagrams.js`: `mri-arch` (the dashboard's architecture) and `mm-erd` (the Music Musings schema). They are drawn when the site is built; the script makes them respond to hover, focus and click. To add one, write another `*Spec()` function returning the same shape, register it in `GRAPHS`, and add its name to the list of allowed graphs in `src/content.config.ts`.

## Accessibility

- A skip link, one `<h1>` per page and headings in order.
- Alt text on every image. The ASCII artwork and other decoration are hidden from assistive technology.
- Keyboard access to the galleries, the full-size view and the diagrams. What an interaction reveals is announced through a live region.
- All real text passes WCAG AA contrast.
- Every link and button is at least 44px tall on a phone.
- The one thing that moves continuously, the ASCII field, has a pause button and stops under reduced motion.
- The single-key shortcuts can be switched off.

## Pages and the status bar

Each page has its own address. The bar pinned to the top is the navigation, drawn like a tmux status line: a session name, one numbered window per page with a star on the current one, the CV and profile links, and a clock. On a phone every window keeps its word and drops its number.

- Press `1` to `5` to pick a page, or `n` and `p` for next and previous. The foot of each page shows these keys beside a switch that turns them off; the choice is remembered.
- Every page ends with previous and next links.

## Deploying

The site is hosted on GitHub Pages from the `ethanransomm.github.io` repository. Every push to `main` runs `.github/workflows/deploy.yml`, which builds the site and publishes it. For that to work, the repository's Pages source must be set to "GitHub Actions" (Settings, then Pages, then Build and deployment).

The site's address is set once, as `site` in `astro.config.mjs`. Canonical links, the sitemap and the link-preview picture are all built from it, so change it there if the site ever moves.

Link previews use `public/preview.jpg`, a 1200×630 picture of the top of the home page. Retake it when the masthead changes.
