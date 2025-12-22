/**
 * Legacy logging service - re-exports from wideLog for backwards compatibility.
 *
 * For new code, import directly from wideLog.ts and use wide events.
 */
export {
	default,
	type WideEvent,
	createWideEvent,
	emitWideEvent,
	enrichWithArticle,
	enrichWithClipping,
	enrichWithDatabase,
	enrichWithError,
	enrichWithSummarization,
	finalizeAndEmit,
	shouldSample,
	configureWideLog,
} from "./wideLog";
