import OpenAI from "openai";
import log from "./log";
const AI_ENDPOINT = process.env.AI_ENDPOINT;
const AI_API_KEY = process.env.AI_API_KEY;
log(`Using ${AI_ENDPOINT} for AI. Key: ${AI_API_KEY ? "set" : "not set"}`);

export const AI_ENABLED = AI_ENDPOINT && AI_API_KEY;

const openai = new OpenAI({
	baseURL: AI_ENDPOINT,
	apiKey: AI_API_KEY,
	defaultHeaders: {
		"HTTP-Referer": process.env.BASE_URL, // Optional. Site URL for rankings on openrouter.ai.
		"X-Title": "yazzy", // Optional. Site title for rankings on openrouter.ai.
	},
});

export async function fetchCompletion(
	systemPrompt: string,
	userPrompt: string,
	model = "google/gemini-2.5-flash-preview-04-17",
	fallbackModels = [
		"google/gemini-2.0-flash-001",
		"openai/gpt-4.1-nano",
		"openai/gpt-4o-mini",
	],
) {
	if (!AI_ENABLED) {
		return null;
	}
	const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
		model,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: userPrompt },
		],
	};
	if (AI_ENDPOINT.includes("openrouter")) {
		// @ts-expect-error OpenRouter-specific option
		params.models = fallbackModels;
	}
	const completion = await openai.chat.completions.create(params);
	return completion;
}
