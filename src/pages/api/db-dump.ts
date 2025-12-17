import type { APIRoute } from "astro";
import db from "../../db/db";

export const GET: APIRoute = async () => {
	const dump = db.$client.serialize();
	const filename = `yazzy-dump-${new Date().toISOString()}.sqlite3`;

	return new Response(dump.buffer as unknown as ArrayBuffer, {
		headers: {
			"Content-Type": "application/vnd.sqlite3",
			"Content-Disposition": `attachment; filename=${filename}`,
			"Content-Length": dump.length.toString(),
		},
	});
};
