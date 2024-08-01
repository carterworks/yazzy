import bun from "@nurodev/astro-bun";
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
	output: "hybrid",
	adapter: bun(),
	integrations: [tailwind()],
});
