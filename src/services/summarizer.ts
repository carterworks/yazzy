import createDomPurify from "dompurify";
import { JSDOM } from "jsdom";
import OpenAI from "openai";
import log from "./log";
const AI_ENDPOINT = process.env.AI_ENDPOINT;
const AI_API_KEY = process.env.AI_API_KEY;
log(`Using ${AI_ENDPOINT} for AI. Key: ${AI_API_KEY ? "set" : "not set"}`);

const openai = new OpenAI({
	baseURL: AI_ENDPOINT,
	apiKey: AI_API_KEY,
	defaultHeaders: {
		"HTTP-Referer": process.env.BASE_URL, // Optional. Site URL for rankings on openrouter.ai.
		"X-Title": "yazzy", // Optional. Site title for rankings on openrouter.ai.
	},
});

const systemPrompt = `You will receive an article. Summarize it. 
Tone and Style
Concise and direct: Use clear and straightforward language.
Neutral and professional: Avoid subjective or emotive language.
Informative: Clearly convey key points without adding opinions.
Structure
Introduction: Begin with a title for the article.
Key Points: Use a <ul> list in HTML to outline the main points. Start each point with a relevant emoji and a theme of the article. Then summarize the article in a few words around that theme.
Length
Brief: Aim for a summary within 30 words, with 5-10 words per point and 3-5 points in total.
Example in HTML
<p>China's exports to Russia are decreasing due to U.S. secondary sanctions and export controls.</p>
<ul>
<li>📊 China's exports: to Russia Exports of ball bearings and Tier 1 items have decreased significantly.</li>
<li>🔨 U.S. economic: tools Secondary sanctions and export controls are influencing China's trade with Russia.</li>
<li>👥 China's role: China is slowly shifting to the coalition side in the economic war against Russia.</li>
</ul>
`;

const DOMPurify = createDomPurify(new JSDOM("<!DOCTYPE html>").window);

async function fetchFromOpenRouter(
	text: string,
	model = "google/gemini-2.0-flash-001",
	fallbackModels = ["openai/gpt-4o-mini", "deepseek/deepseek-chat"],
) {
	const params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming = {
		model,
		messages: [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: text },
		],
	};
	if (AI_ENDPOINT.includes("openrouter")) {
		// @ts-expect-error OpenRouter-specific option
		params.models = fallbackModels;
	}
	const completion = await openai.chat.completions.create(params);
	return completion;
}

const addGenerationInformation = (
	model: string,
	date: string,
	message: string,
) => {
	const generationMessage = `<p><em>Generated on ${date} using ${model}</em></p>${message}`;
	return generationMessage;
};

export async function summarize(text: string): Promise<string> {
	if (!text || !AI_API_KEY) {
		return "";
	}
	const response = await fetchFromOpenRouter(text);
	const message = response.choices[0].message.content;
	if (!message) {
		throw new Error("No message returned from OpenRouter");
	}
	const generationDate = new Date()
		.toLocaleString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		})
		.replace(",", "");
	const generationMessage = addGenerationInformation(
		response.model,
		generationDate,
		message,
	);
	return DOMPurify.sanitize(generationMessage);
}
