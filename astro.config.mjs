import node from "@astrojs/node";
import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";

import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
	output: "hybrid",
	adapter: node({
		mode: "standalone",
	}),
	integrations: [
		tailwind(),
		icon({
			include: {
				lucide: ["notebook-text", "file-type"],
				local: ["inbox-download", "attach"],
			},
		}),
	],
});
