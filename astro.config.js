import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

import node from "@astrojs/node";

export default defineConfig({
  vite: {
    plugins: [tailwind()],
  },

  adapter: node({
    mode: "standalone",
  }),
});
