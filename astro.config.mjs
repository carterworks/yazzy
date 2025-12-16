import node from "@astrojs/node";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "server", // Full SSR
	adapter: node({
		mode: "standalone",
	}),
	integrations: [tailwind()],
	server: {
		host: true,
	},
});
