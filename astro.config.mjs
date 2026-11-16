// @ts-check
import { defineConfig } from "astro/config";

import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  // The address the site is served from. Canonical links, the sitemap and
  // the link-preview image are all built from it, so change it here if the
  // site ever moves.
  site: "https://ethanransomm.github.io",
  integrations: [
    mdx(),
    // A page under /preview/ is for looking at work in progress before it is
    // adopted. None exists at the moment; any that does stays out of the
    // sitemap.
    sitemap({ filter: (page) => !page.includes("/preview/") }),
  ],
  // Tailwind runs as a Vite plugin. Its setup is in src/styles/tailwind.css.
  vite: { plugins: [tailwindcss()] },
});
