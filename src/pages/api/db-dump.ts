import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";
import db from "../../db/db";
import log from "../../services/log";

function getMemoryUsageMB(): string {
	const usage = process.memoryUsage();
	return `heap=${Math.round(usage.heapUsed / 1024 / 1024)}MB, rss=${Math.round(usage.rss / 1024 / 1024)}MB`;
}

export const GET: APIRoute = async ({ request }) => {
	const requestId = request.headers.get("x-request-id") || "unknown";
	log(
		`[requestId=${requestId}] db-dump: Starting. Memory: ${getMemoryUsageMB()}`,
	);

	const dbPath = process.env["DB_PATH"];

	// If using in-memory database, fall back to serialize (dev only)
	if (!dbPath || dbPath === ":memory:") {
		log(
			`[requestId=${requestId}] db-dump: Using in-memory serialize (dev mode)`,
		);
		const dump = db.$client.serialize();
		const filename = `yazzy-dump-${new Date().toISOString()}.sqlite3`;
		return new Response(dump.buffer as unknown as ArrayBuffer, {
			headers: {
				"Content-Type": "application/vnd.sqlite3",
				"Content-Disposition": `attachment; filename=${filename}`,
				"Content-Length": dump.length.toString(),
			},
		});
	}

	// For file-based database, stream directly from disk to avoid OOM
	try {
		// Checkpoint WAL to ensure all data is in the main file
		log(`[requestId=${requestId}] db-dump: Checkpointing WAL...`);
		db.run(sql`PRAGMA wal_checkpoint(TRUNCATE);`);
		log(
			`[requestId=${requestId}] db-dump: WAL checkpoint complete. Memory: ${getMemoryUsageMB()}`,
		);

		const file = Bun.file(dbPath);
		const exists = await file.exists();
		if (!exists) {
			log(
				`[requestId=${requestId}] db-dump: Database file not found at ${dbPath}`,
			);
			return new Response("Database file not found", { status: 500 });
		}

		const fileSize = file.size;
		log(
			`[requestId=${requestId}] db-dump: Streaming ${Math.round(fileSize / 1024 / 1024)}MB file from disk`,
		);

		const filename = `yazzy-dump-${new Date().toISOString()}.sqlite3`;

		// Stream the file directly - Bun.file().stream() is memory efficient
		return new Response(file.stream(), {
			headers: {
				"Content-Type": "application/vnd.sqlite3",
				"Content-Disposition": `attachment; filename=${filename}`,
				"Content-Length": fileSize.toString(),
			},
		});
	} catch (error) {
		log(`[requestId=${requestId}] db-dump: Error - ${error}`);
		return new Response(`Database dump failed: ${error}`, { status: 500 });
	}
};
