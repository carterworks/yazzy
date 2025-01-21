import { Database } from "bun:sqlite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

function initalizeDB() {
	const client = new Database(process.env.DB_PATH || ":memory:");
	const db = drizzle({ client, schema });
	db.run(sql`PRAGMA journal_mode=WAL;`);
	return db;
}

const db = initalizeDB();
export default db;
