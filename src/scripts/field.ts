// The ASCII field: several sine waves interfere, and the result is drawn as
// data. Quiet cells are dots, busier ones are punctuation, and the crests
// resolve into hex digits. The glyph at a given cell never changes, only how
// bright it is, so the field moves without any flicker.
//
// It is drawn as a wide, low band: the sky over the power lines on the home
// page. It is brightest along a line near its top and thins out downward, so
// the poles beneath rise into it.
//
// This one function draws it in two places: once when the site is built, so
// the page arrives with a finished frame in its HTML, and again in the
// browser to animate it. Keep it free of anything browser-only.

const HEX = "0123456789ABCDEF";
const LEVELS = [" ", "·", ":", "+", "#", "#", "#"];
const LEVEL_CLASS = ["", "a-grid", "a-lo", "a-mid", "a-glow", "a-hi", "a-crest"];

/** The size of the band, in characters. It is wider than most windows; the
    page shows its middle and fades the ends. */
export const FIELD_COLS = 170;
export const FIELD_ROWS = 9;
/** Where the animation starts. This is also the frame a visitor with motion
    turned off sees for good, so it is one chosen for having patches of light
    right across the band, neither empty nor a solid bar. */
export const FIELD_T0 = 31.56;

function cellHash(x: number, y: number): number {
  return ((x * 374761393 + y * 668265263) >>> 13) & 15;
}

function smooth(a: number, b: number, v: number): number {
  const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** One frame, as HTML: rows of text with a span per run of one brightness. */
export function fieldFrame(cols: number, rows: number, t: number): string {
  const out: string[] = [];
  const cx = cols * 0.5;
  const cy = rows * 0.4;

  for (let y = 0; y < rows; y++) {
    let line = "";
    let cur: string | null = null;
    let buf = "";
    // a soft fade at the top and a long one toward the bottom; the ends of
    // the band are faded by the page, since how much shows depends on the
    // width of the window
    const ey = Math.min(
      smooth(0, 0.2, (y + 0.5) / rows),
      1 - smooth(0.42, 1, (y + 0.5) / rows),
    );

    for (let x = 0; x < cols; x++) {
      let v =
        Math.sin(x * 0.075 + t) +
        Math.sin(y * 0.24 - t * 0.8) +
        Math.sin(x * 0.04 + y * 0.17 + t * 0.55) +
        Math.sin(
          Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy) * 5) * 0.2 -
            t * 1.1,
        );
      // Sharpened, so most of the sky is quiet dots and the bright patches
      // are few and drift through it.
      v = Math.pow((v / 4 + 1) / 2, 1.7) * ey;

      const lvl = Math.min(6, Math.floor(v * 9.2));
      let ch = LEVELS[lvl];
      if (lvl >= 4) ch = HEX.charAt(cellHash(x, y));
      else if (lvl === 3) ch = cellHash(x, y) & 1 ? "+" : "=";

      const cls = LEVEL_CLASS[lvl];
      if (cls !== cur) {
        if (buf) line += cur ? `<span class="${cur}">${buf}</span>` : buf;
        buf = "";
        cur = cls;
      }
      buf += ch;
    }
    if (buf) line += cur ? `<span class="${cur}">${buf}</span>` : buf;
    out.push(line);
  }
  return out.join("\n");
}
