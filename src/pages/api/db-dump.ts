import type { APIRoute } from "astro";
import { sql } from "drizzle-orm";
import db from "../../db/db";
import { event, facet } from "../../services/telemetry";

type DumpFields = { source: "memory" | "file"; bytes: number };
const telemetry = facet<DumpFields>("dump");

export const GET: APIRoute = async () => {
	const dbPath = process.env["DB_PATH"];

	// If using in-memory database, fall back to serialize (dev only)
	if (!dbPath || dbPath === ":memory:") {
		const dump = db.$client.serialize();
		telemetry.set({ source: "memory", bytes: dump.length });
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
		telemetry.set({ source: "file" });
		// Checkpoint WAL to ensure all data is in the main file
		await telemetry.time("checkpoint", () =>
			db.run(sql`PRAGMA wal_checkpoint(TRUNCATE);`),
		);

		const file = Bun.file(dbPath);
		if (!(await file.exists())) {
			event.error(new Error(`Database file not found at ${dbPath}`));
			return new Response("Database file not found", { status: 500 });
		}

		const fileSize = file.size;
		telemetry.set({ bytes: fileSize });

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
		event.error(error);
		return new Response(`Database dump failed: ${error}`, { status: 500 });
	}
};
