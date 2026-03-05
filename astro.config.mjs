import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

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
