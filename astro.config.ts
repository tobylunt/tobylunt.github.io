import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import fs from "fs";
import rehypeExternalLinks from "rehype-external-links";
import rehypeUnwrapImages from "rehype-unwrap-images";

import { expressiveCodeOptions } from "./src/site.config";
import { remarkReadingTime } from "./src/utils/remark-reading-time";

// https://astro.build/config
export default defineConfig({
  image: {
    domains: ["webmention.io"],
  },
  // scripts: ['client'],
  integrations: [
    expressiveCode(expressiveCodeOptions),
    icon(),
    sitemap(),
    mdx(),
  ],
  markdown: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          rel: ["nofollow, noopener, noreferrer"],
          target: "_blank",
        },
      ],
      rehypeUnwrapImages,
    ],
    remarkPlugins: [remarkReadingTime],
    remarkRehype: {
      footnoteLabelProperties: {
        className: [""],
      },
    },
  },
  // https://docs.astro.build/en/guides/prefetch/
  prefetch: true,
  site: "https://tobiaslunt.com",
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    plugins: [tailwindcss(), rawFonts([".ttf", ".woff"])],
    ssr: {
      noExternal: ["three"],
    },
  },
});

function rawFonts(ext: string[]) {
  return {
    name: "vite-plugin-raw-fonts",
    // @ts-expect-error:next-line
    transform(_, id) {
      // eslint-disable-next-line
      if (ext.some((e) => id.endsWith(e))) {
        // eslint-disable-next-line
        const buffer = fs.readFileSync(id);
        return {
          code: `export default ${JSON.stringify(buffer)}`,
          map: null,
        };
      }
    },
  };
}
