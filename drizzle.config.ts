import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/services/Database/migrations",
  schema: "./src/services/Database/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: Bun.env.DB_PATH ?? ":memory:",
  },
});
