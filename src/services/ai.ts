import { OpenRouter } from "@openrouter/sdk";
import log from "./log";
const AI_API_KEY = process.env["AI_API_KEY"];
log(`Using OpenRouter for AI. Key: ${AI_API_KEY ? "set" : "not set"}`);

export const AI_ENABLED = !!AI_API_KEY;

const client = new OpenRouter({
	apiKey: AI_API_KEY,
});

const models = Object.freeze({
	openai: {
		gpt5: {
			nano: "openai/gpt-5-nano", // $0.05/1M input, $0.40/1M output,
			mini: "openai/gpt-5-mini", // $0.25/1M input, $2.00/1M output,
		},
		gptOss: {
			presto120b: "openai/gpt-oss-120b:presto",
			presto20b: "openai/gpt-oss-20b:presto",
		},
	},
	google: {
		gemini2dot5: {
			flash: "google/gemini-2.5-flash", // $0.30/1M input, $2.50/1M output
			flashLite: "google/gemini-2.5-flash-lite", // $0.10/1M input, $0.40/1M output
		},
	},
	anthropic: {
		claude: {
			haiku45: "anthropic/claude-haiku-4.5",
		},
	},
});

export async function fetchCompletion(
	systemPrompt: string,
	userPrompt: string,
	model = models.openai.gptOss.presto120b,
	fallbackModels = [
		models.openai.gptOss.presto20b,
		models.anthropic.claude.haiku45,
	],
): Promise<{ text: string; model: string } | null> {
	if (!AI_ENABLED) {
		return null;
	}
	const result = client.callModel({
		model,
		models: fallbackModels,
		instructions: systemPrompt,
		input: userPrompt,
		reasoning: {
			effort: "low",
		},
	});
	const text = await result.getText();
	if (!text) {
		return null;
	}
	return { text, model };
}
