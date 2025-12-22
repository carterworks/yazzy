import { version } from "../../package.json" with { type: "json" };

/**
 * Wide Event Logging System
 *
 * Implements the "wide events" / "canonical log lines" pattern:
 * - One comprehensive log event per request per service
 * - High cardinality (many unique values like request IDs, URLs)
 * - High dimensionality (many fields for rich context)
 * - Context built throughout request lifecycle, emitted once at the end
 * - Tail sampling to keep costs under control
 *
 * @see https://loggingsucks.com/
 */

// ============================================================================
// Types
// ============================================================================

export interface WideEvent {
	// Core identifiers
	timestamp: string;
	request_id: string;
	service: string;
	version: string;
	environment: string;

	// Request info
	request: {
		method: string;
		path: string;
		query?: Record<string, string>;
		user_agent?: string;
		referer?: string;
		content_type?: string;
		ip?: string;
	};

	// Response info
	response?: {
		status_code: number;
		content_type?: string;
		size_bytes?: number;
	};

	// Timing
	duration_ms?: number;
	outcome?: "success" | "error" | "redirect";

	// Article context (business entity)
	article?: {
		url?: string;
		title?: string;
		author?: string;
		hostname?: string;
		is_youtube?: boolean;
		is_cached?: boolean;
		content_length?: number;
		tags?: string[];
		published?: string;
	};

	// Clipping operation context
	clipping?: {
		fetch_duration_ms?: number;
		parse_duration_ms?: number;
		markdown_length?: number;
		html_length?: number;
	};

	// Summarization context
	summarization?: {
		enabled?: boolean;
		model?: string;
		duration_ms?: number;
		input_tokens?: number;
		output_tokens?: number;
	};

	// Database operations
	database?: {
		operation?: "read" | "write" | "count";
		duration_ms?: number;
		cache_hit?: boolean;
		article_count?: number;
	};

	// Error context
	error?: {
		type: string;
		message: string;
		code?: string;
		stack?: string;
		retriable?: boolean;
	};

	// Custom dimensions (extensible)
	custom?: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

interface WideLogConfig {
	/** Service name for all events */
	serviceName: string;
	/** Enable structured JSON output (vs pretty-printed) */
	jsonOutput: boolean;
	/** Sample rate for successful requests (0-1, default 0.1 = 10%) */
	successSampleRate: number;
	/** Always keep requests slower than this (ms) */
	slowThresholdMs: number;
	/** Enable logging to console */
	enabled: boolean;
}

const defaultConfig: WideLogConfig = {
	serviceName: "yazzy",
	jsonOutput: process.env.NODE_ENV === "production",
	successSampleRate: 0.1,
	slowThresholdMs: 2000,
	enabled: true,
};

let config: WideLogConfig = { ...defaultConfig };

export function configureWideLog(overrides: Partial<WideLogConfig>) {
	config = { ...config, ...overrides };
}

// ============================================================================
// Wide Event Builder
// ============================================================================

export function createWideEvent(requestId: string, request: Request): WideEvent {
	const url = new URL(request.url);
	const queryParams: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		queryParams[key] = value;
	});

	return {
		timestamp: new Date().toISOString(),
		request_id: requestId,
		service: config.serviceName,
		version: version,
		environment: process.env.NODE_ENV ?? "development",
		request: {
			method: request.method,
			path: url.pathname,
			query: Object.keys(queryParams).length > 0 ? queryParams : undefined,
			user_agent: request.headers.get("user-agent") ?? undefined,
			referer: request.headers.get("referer") ?? undefined,
			content_type: request.headers.get("content-type") ?? undefined,
			ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
				request.headers.get("x-real-ip") ??
				undefined,
		},
	};
}

// ============================================================================
// Tail Sampling
// ============================================================================

/**
 * Determines whether an event should be sampled (kept) based on tail sampling rules.
 *
 * Rules (in order of priority):
 * 1. Always keep errors (5xx, exceptions)
 * 2. Always keep slow requests (above threshold)
 * 3. Always keep requests with errors attached
 * 4. Random sample successful requests at configured rate
 */
export function shouldSample(event: WideEvent): boolean {
	// Always keep errors
	if (event.response?.status_code && event.response.status_code >= 500) {
		return true;
	}

	// Always keep if error attached
	if (event.error) {
		return true;
	}

	// Always keep slow requests
	if (event.duration_ms && event.duration_ms > config.slowThresholdMs) {
		return true;
	}

	// Always keep 4xx client errors (useful for debugging)
	if (event.response?.status_code && event.response.status_code >= 400) {
		return true;
	}

	// Random sample the rest
	return Math.random() < config.successSampleRate;
}

// ============================================================================
// Formatting
// ============================================================================

function formatEventPretty(event: WideEvent): string {
	const parts: string[] = [];

	// Status indicator
	const statusIcon =
		event.outcome === "error"
			? "ERR"
			: event.outcome === "redirect"
				? "RED"
				: "OK ";

	// Core line
	parts.push(
		`[${event.timestamp}] ${statusIcon} ${event.request_id} ${event.request.method} ${event.request.path}`,
	);

	// Response info
	if (event.response) {
		parts.push(`${event.response.status_code}`);
	}
	if (event.duration_ms !== undefined) {
		parts.push(`${event.duration_ms.toFixed(0)}ms`);
	}

	// Article context (if present)
	if (event.article?.url) {
		const cached = event.article.is_cached ? "[cached]" : "[fresh]";
		const type = event.article.is_youtube ? "[youtube]" : "";
		parts.push(`| article: ${cached}${type} ${event.article.hostname}`);
	}

	// Error context (if present)
	if (event.error) {
		parts.push(`| error: ${event.error.type}: ${event.error.message}`);
	}

	// Timing breakdown (if available)
	const timings: string[] = [];
	if (event.clipping?.fetch_duration_ms) {
		timings.push(`fetch:${event.clipping.fetch_duration_ms}ms`);
	}
	if (event.clipping?.parse_duration_ms) {
		timings.push(`parse:${event.clipping.parse_duration_ms}ms`);
	}
	if (event.database?.duration_ms) {
		timings.push(`db:${event.database.duration_ms}ms`);
	}
	if (event.summarization?.duration_ms) {
		timings.push(`ai:${event.summarization.duration_ms}ms`);
	}
	if (timings.length > 0) {
		parts.push(`| ${timings.join(" ")}`);
	}

	return parts.join(" ");
}

function formatEventJson(event: WideEvent): string {
	// Remove undefined values for cleaner JSON
	return JSON.stringify(event, (_, value) =>
		value === undefined ? undefined : value
	);
}

// ============================================================================
// Emission
// ============================================================================

/**
 * Emit a wide event to the configured output.
 * Applies tail sampling before output.
 */
export function emitWideEvent(event: WideEvent): void {
	if (!config.enabled) {
		return;
	}

	// Apply tail sampling
	if (!shouldSample(event)) {
		return;
	}

	const output = config.jsonOutput
		? formatEventJson(event)
		: formatEventPretty(event);

	// Use appropriate log level based on outcome
	if (event.outcome === "error" || event.error) {
		console.error(output);
	} else {
		console.log(output);
	}
}

// ============================================================================
// Context Enrichment Helpers
// ============================================================================

/**
 * Add article context to the wide event
 */
export function enrichWithArticle(
	event: WideEvent,
	article: {
		url: string;
		title?: string | null;
		author?: string | null;
		tags?: string[];
		published?: Date;
		markdownContent?: string | null;
		htmlContent?: string | null;
	},
	options?: { isCached?: boolean },
): void {
	const articleUrl = new URL(article.url);
	event.article = {
		url: article.url,
		title: article.title ?? undefined,
		author: article.author ?? undefined,
		hostname: articleUrl.hostname,
		is_youtube: articleUrl.hostname.includes("youtu"),
		is_cached: options?.isCached ?? false,
		content_length: article.markdownContent?.length ?? undefined,
		tags: article.tags,
		published: article.published?.toISOString(),
	};
}

/**
 * Add clipping operation timing to the wide event
 */
export function enrichWithClipping(
	event: WideEvent,
	timing: {
		fetchDurationMs?: number;
		parseDurationMs?: number;
	},
	result?: {
		markdownLength?: number;
		htmlLength?: number;
	},
): void {
	event.clipping = {
		fetch_duration_ms: timing.fetchDurationMs,
		parse_duration_ms: timing.parseDurationMs,
		markdown_length: result?.markdownLength,
		html_length: result?.htmlLength,
	};
}

/**
 * Add database operation context to the wide event
 */
export function enrichWithDatabase(
	event: WideEvent,
	operation: "read" | "write" | "count",
	options?: {
		durationMs?: number;
		cacheHit?: boolean;
		articleCount?: number;
	},
): void {
	event.database = {
		operation,
		duration_ms: options?.durationMs,
		cache_hit: options?.cacheHit,
		article_count: options?.articleCount,
	};
}

/**
 * Add summarization context to the wide event
 */
export function enrichWithSummarization(
	event: WideEvent,
	options: {
		enabled: boolean;
		model?: string;
		durationMs?: number;
		inputTokens?: number;
		outputTokens?: number;
	},
): void {
	event.summarization = {
		enabled: options.enabled,
		model: options.model,
		duration_ms: options.durationMs,
		input_tokens: options.inputTokens,
		output_tokens: options.outputTokens,
	};
}

/**
 * Add error context to the wide event
 */
export function enrichWithError(
	event: WideEvent,
	error: unknown,
	options?: { retriable?: boolean },
): void {
	if (error instanceof Error) {
		event.error = {
			type: error.name,
			message: error.message,
			stack:
				process.env.NODE_ENV !== "production" ? error.stack : undefined,
			retriable: options?.retriable ?? false,
		};
	} else if (typeof error === "string") {
		event.error = {
			type: "Error",
			message: error,
			retriable: options?.retriable ?? false,
		};
	} else {
		event.error = {
			type: "UnknownError",
			message: String(error),
			retriable: options?.retriable ?? false,
		};
	}
}

/**
 * Finalize the wide event with response info and emit it
 */
export function finalizeAndEmit(
	event: WideEvent,
	response: Response,
	startTime: number,
): void {
	const durationMs = performance.now() - startTime;

	event.duration_ms = durationMs;
	event.response = {
		status_code: response.status,
		content_type: response.headers.get("content-type") ?? undefined,
	};

	// Determine outcome
	if (response.status >= 500) {
		event.outcome = "error";
	} else if (response.status >= 300 && response.status < 400) {
		event.outcome = "redirect";
	} else {
		event.outcome = "success";
	}

	emitWideEvent(event);
}

// ============================================================================
// Legacy log function (for gradual migration)
// ============================================================================

function formatMessage(message: string) {
	return `[${new Date().toISOString()}] ${message}`;
}

/**
 * Legacy log function for backwards compatibility.
 * Prefer using wide events for request-scoped logging.
 */
export default function log(message: string, ...rest: string[]) {
	console.log(formatMessage(message), ...rest);
}

function error(message: string, ...rest: string[]) {
	console.error(formatMessage(message), ...rest);
}

log.error = error;
