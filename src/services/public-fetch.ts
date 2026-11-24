import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

type Lookup = (hostname: string) => Promise<string[]>;

const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** The URL points somewhere yazzy refuses to fetch: not HTTP(S), or not a public address. */
export class NonPublicUrlError extends Error {
	override name = "NonPublicUrlError";
}

// Only for tests that clip from a local fixture server; never set in production.
function allowedPrivateHosts(): string[] {
	return (process.env["CLIP_ALLOW_PRIVATE_HOSTS"] ?? "")
		.split(",")
		.map((host) => host.trim())
		.filter(Boolean);
}

async function lookupAll(hostname: string): Promise<string[]> {
	const addresses = await lookup(hostname, { all: true, verbatim: true });
	return addresses.map(({ address }) => address);
}

// Header values arrive as latin1, but servers commonly send raw UTF-8 in
// Location; automatic redirects decode it as UTF-8, so match that.
function decodeLocation(location: string): string {
	try {
		return new TextDecoder("utf-8", { fatal: true }).decode(
			Buffer.from(location, "latin1"),
		);
	} catch {
		return location;
	}
}

// Allow-list public unicast rather than deny-listing private ranges, so every
// special-purpose range (loopback, private, link-local, Fly's fdaa::/16, ...)
// is refused without naming it.
function isPublicAddress(address: string): boolean {
	return ipaddr.process(address).range() === "unicast";
}

async function assertPublicUrl(url: URL, resolve: Lookup): Promise<void> {
	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new NonPublicUrlError(
			`Unsupported protocol "${url.protocol}" for ${url}`,
		);
	}
	const hostname = url.hostname.replace(/^\[(.*)\]$/, "$1");
	if (allowedPrivateHosts().includes(hostname)) return;
	const addresses = ipaddr.isValid(hostname)
		? [hostname]
		: await resolve(hostname);
	if (addresses.length === 0 || !addresses.every(isPublicAddress)) {
		throw new NonPublicUrlError(
			`Refusing to fetch ${url}: not a public address`,
		);
	}
}

/**
 * Fetch a URL, following redirects manually so every hop is checked to point
 * at a public address. The resolved address is not pinned for the request
 * itself, so a DNS server that answers differently on the second lookup can
 * still slip past this check.
 */
export async function fetchPublic(
	url: URL,
	init: RequestInit = {},
	resolve: Lookup = lookupAll,
): Promise<{ response: Response; url: URL }> {
	let currentUrl = url;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		await assertPublicUrl(currentUrl, resolve);
		const response = await fetch(currentUrl, { ...init, redirect: "manual" });
		const location = response.headers.get("location");
		if (!REDIRECT_STATUSES.has(response.status) || !location) {
			return { response, url: currentUrl };
		}
		await response.body?.cancel();
		currentUrl = new URL(decodeLocation(location), currentUrl);
	}
	throw new Error(`Too many redirects fetching ${url}`);
}
