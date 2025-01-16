export default function log(message: string, ...rest: string[]) {
	console.log(`[${new Date().toISOString()}]`, message, ...rest);
}
