import { Database } from "bun:sqlite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { logger } from "../Logger";
import * as schema from "./schema";

const DB_PATH = Bun.env.DB_PATH || ":memory:";
logger.log(`DB path is ${DB_PATH}`);

function initalizeDB(location: string = DB_PATH) {
  const client = new Database(location);
  const db = drizzle({
    client,
    schema,
    logger: Bun.env.NODE_ENV === "development",
  });
  db.run(sql`PRAGMA journal_mode=WAL;`);
  runMigrations(db);
  return db;
}

function runMigrations(db: ReturnType<typeof initalizeDB>) {
  migrate(db, { migrationsFolder: "./src/services/Database/migrations" });
  logger.log("Migrations complete");
}

const db = initalizeDB();
export default db;
