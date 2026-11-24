import { OpenRouter } from "@openrouter/sdk";
import { facet, log } from "./telemetry";

const AI_API_KEY = process.env["AI_API_KEY"];
const AI_ENDPOINT = process.env["AI_ENDPOINT"];

export const AI_ENABLED = !!AI_API_KEY;
log.info("AI summaries configured", {
	enabled: AI_ENABLED,
	custom_endpoint: !!AI_ENDPOINT,
});

const client = new OpenRouter({
	apiKey: AI_API_KEY,
	...(AI_ENDPOINT ? { serverURL: AI_ENDPOINT } : {}),
});

type AiFields = {
	model_requested: string;
	model_used: string;
	tokens_in: number;
	tokens_out: number;
	cost_usd: number;
};
const telemetry = facet<AiFields>("ai");

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
	telemetry.set({ model_requested: model });
	const { response, text } = await telemetry.time("completion", async () => {
		const result = client.callModel({
			model,
			models: fallbackModels,
			instructions: systemPrompt,
			input: userPrompt,
			reasoning: {
				effort: "low",
			},
		});
		const response = await result.getResponse();
		return { response, text: await result.getText() };
	});
	telemetry.set({
		model_used: response.model,
		tokens_in: response.usage?.inputTokens,
		tokens_out: response.usage?.outputTokens,
		cost_usd: response.usage?.cost ?? undefined,
	});
	if (!text) {
		return null;
	}
	return { text, model: response.model || model };
}
