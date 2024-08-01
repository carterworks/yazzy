export function isUrl(potentialUrl: string): boolean {
	try {
		new URL(potentialUrl);
		return true;
	} catch {
		return false;
	}
}
