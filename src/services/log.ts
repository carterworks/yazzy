function formatMessage(message: string) {
	return `[${new Date().toISOString()}] ${message}`;
}

export default function log(message: string, ...rest: string[]) {
	console.log(formatMessage(message), ...rest);
}

function error(message: string, ...rest: string[]) {
	console.error(formatMessage(message), ...rest);
}

log.error = error;
