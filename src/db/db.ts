import { Database } from "bun:sqlite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import log from "../services/log";
import * as schema from "./schema";

function initalizeDB(location: string = process.env.DB_PATH || ":memory:") {
	const client = new Database(location);
	const db = drizzle({
		client,
		schema,
		logger: process.env.NODE_ENV === "development",
	});
	db.run(sql`PRAGMA journal_mode=WAL;`);
	runMigrations(db);
	return db;
}

function runMigrations(db: ReturnType<typeof initalizeDB>) {
	migrate(db, { migrationsFolder: "./src/db/migrations" });
	log("Migrations complete");
}

const db = initalizeDB();
export default db;
