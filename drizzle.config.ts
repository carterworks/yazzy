import { defineConfig } from "drizzle-kit";
import schema from "./src/db/schema.ts" with { type: "file" };

export default defineConfig({
	out: "./src/db/migrations",
	schema,
	dialect: "sqlite",
	dbCredentials: {
		url: process.env.DB_PATH ?? ":memory:",
	},
});
