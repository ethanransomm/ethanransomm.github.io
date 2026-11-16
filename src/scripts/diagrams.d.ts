// Types for the drawing code in diagrams.js, which is plain JavaScript.

/** One of the drawn gallery slides. */
export interface GraphSpec {
  /** What the caption says when nothing is selected. */
  idle: string;
  /** The drawing as SVG text. `interactive` makes its nodes focusable. */
  build(uid: string, alt: string, interactive: boolean): string;
  neighbours(id: string): string[];
  describe(id: string): string;
}

export const GRAPHS: Record<string, () => GraphSpec>;

export const DIAGRAMS: Record<
  string,
  {
    label: string;
    note: string;
    tabs: { id: string; name: string; desc: string }[];
  }
>;

/** Build a tabbed model diagram. Browser only. */
export function renderDiagram(name: string): HTMLElement | null;

/** Make a drawn graph respond to hover, focus and click. Browser only. */
export function wireGraph(
  host: Element,
  spec: GraphSpec,
  say: (text: string) => void,
  idle: string,
): void;
