import Database from "better-sqlite3";
import type BetterSqlite3 from "better-sqlite3";

function getSchemaVersion(db: BetterSqlite3.Database): number {
	// first, check if the schema version table exists
	const schemaVersionTable = db
		.prepare(
			"SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'",
		)
		.get();
	if (!schemaVersionTable) {
		return -1;
	}
	const row = db
		.prepare<[], { version: number }>("SELECT version FROM schema_version")
		.get();
	return row?.version ?? -1;
}
function incrementSchemaVersion(db: BetterSqlite3.Database): void {
	db.prepare("UPDATE schema_version SET version = version + 1").run();
}

type Migration = (db: BetterSqlite3.Database) => void;
const migrations: Migration[] = [
	/**
	 * Initial version
	 * Creates article table and schema version table
	 */
	function v0(db: BetterSqlite3.Database) {
		db.prepare(`CREATE TABLE IF NOT EXISTS articles (
			url TEXT PRIMARY KEY,
			title TEXT,
			author TEXT,
			published INTEGER,
			tags TEXT,
			markdownContent TEXT,
			textContent TEXT,
			htmlContent TEXT,
			createdAt INTEGER,
			summary TEXT
		)`).run();

		db.prepare(`CREATE TABLE IF NOT EXISTS schema_version (
			version INTEGER PRIMARY KEY
		)`).run();

		// will be incremented after migration is run
		db.prepare("INSERT INTO schema_version (version) VALUES (-1)").run();
	},
];

function listTables(db: BetterSqlite3.Database): string[] {
	return db
		.prepare<unknown[], { name: string }>(
			"SELECT name FROM sqlite_master WHERE type='table'",
		)
		.all()
		.map((row) => row.name);
}

function initalizeDB(location = ":memory:"): YazzyDB {
	const db = new Database(location, {});
	db.pragma("journal_mode = WAL");
	const currentVersion = getSchemaVersion(db);
	const newMigrations =
		currentVersion === -1 ? migrations : migrations.slice(currentVersion + 1);
	for (const migration of newMigrations) {
		migration(db);
		incrementSchemaVersion(db);
	}
	const tableNames = listTables(db);
	console.log(
		"Database initialized with tables %s [location: %s][version: %d][migrationsRun: %d]",
		tableNames.join(","),
		location,
		getSchemaVersion(db),
		newMigrations.length,
	);
	return db;
}

const db = initalizeDB(process.env.DB_PATH);
export default db;
export type YazzyDB = BetterSqlite3.Database;
export type YazzyDBStatement<
	// biome-ignore lint/complexity/noBannedTypes: Type is copied directly from BetterSqlite3
	BindParameters extends unknown[] | {} = unknown[],
	Result = unknown,
> = BetterSqlite3.Statement<BindParameters, Result>;
