import node from "@astrojs/node";
import { defineConfig } from "astro/config";

import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
	// Full SSR
	output: "server",

	adapter: node({
		mode: "standalone",
	}),

	server: {
		host: true,
	},

	vite: {
		plugins: [tailwindcss()],
	},
});
