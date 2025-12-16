import node from "@astrojs/node";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	output: "server", // Full SSR
	adapter: node({
		mode: "standalone",
	}),
	server: {
		host: true,
	},
});
