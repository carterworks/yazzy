import type { APIRoute } from "astro";
import db from "../../services/db";
export const prerender = false;

const { subtle } = globalThis.crypto;

async function getEtag(buf: Buffer) {
	const hashBytes = await subtle.digest("SHA-256", buf);
	const hashArray = Array.from(new Uint8Array(hashBytes));
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return hashHex;
}

/**
 * GET /api/dump
 * Returns a response containing the entire database, ready to be loaded as a new database.
 * Response is a sqlite3 dump file.
 */
export const GET: APIRoute = async () => {
	const start = performance.now();
	const dump = db.serialize();
	const datetime = new Date().toISOString().replace(/:/g, "-");
	const etag = await getEtag(dump);
	const processingTime = performance.now() - start;
	console.log(`Dumped database in ${processingTime}ms`);
	return new Response(db.serialize(), {
		headers: {
			"Content-Type": "application/vnd.sqlite3",
			"Content-Disposition": `attachment; filename=yazzy-dump-${datetime}.sqlite3`,
			"Content-Length": dump.length.toString(),
			ETag: etag,
			"X-Processing-Time": processingTime.toString(),
		},
	});
};
