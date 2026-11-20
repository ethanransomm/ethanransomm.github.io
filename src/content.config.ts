// What a project write-up is made of. Each file in src/content/projects/ is
// one project: the facts in its header are checked against this shape when
// the site is built, so a missing caption or a mistyped field stops the build
// instead of reaching the page. The prose under the header is the write-up.
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
  loader: glob({ pattern: "*.mdx", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Where it sits on the projects page, lowest first. */
      order: z.number(),
      /** The small line under the title: module, grade, one-line framing. */
      context: z.string(),
      /** One or two sentences on what it is and who it is for. */
      summary: z.string(),
      /** The repository, as owner/name. It titles the screenshot window. */
      repo: z.string(),

      /** Buttons. A link with an empty url is left out until it has one. */
      links: z.array(z.object({ label: z.string(), url: z.string() })),

      /** The shape of the screenshot window, as "width / height". */
      ratio: z.string().default("16 / 9"),
      /**
       * The gallery, first slide first. A slide is either a screenshot
       * (`image`) or one of the drawn graphs (`graph`). Every slide needs
       * its alt text, the caption shown under it and a short thumbnail label.
       */
      shots: z
        .array(
          z.object({
            image: image().optional(),
            graph: z.enum(["mri-arch", "mm-erd", "spotify-arch"]).optional(),
            alt: z.string(),
            caption: z.string(),
            label: z.string(),
          }),
        )
        .min(1),

      /** Headline numbers, drawn as bars under the summary. */
      results: z
        .object({
          label: z.string(),
          max: z.number(),
          rows: z.array(
            z.object({
              label: z.string(),
              value: z.number(),
              /** One of the model colours the diagrams use. */
              tone: z.enum(["d-ensemble", "d-swin", "d-unetpp"]).optional(),
            }),
          ),
        })
        .optional(),

      tech: z.array(z.string()),
      /** A caveat, shown in an accented callout beside the write-up. */
      note: z.string().optional(),
      /** The interactive model diagram to show after the write-up. */
      diagram: z.enum(["cspca"]).optional(),
    }),
});

export const collections = { projects };
