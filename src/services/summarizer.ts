import createDomPurify from "dompurify";
import { JSDOM } from "jsdom";
import { AI_ENABLED, fetchCompletion } from "./ai";

const systemPrompt = `## ROLE
You are a professional summarization assistant.

## TASK
Summarize the ARTICLE provided between the <article> tags. Additionally, pick a
short quote from the article and add it to the output. The quote should be a
short snippet, 2-3 sentences, repeated exactly verbatim from the article, that
is representative of the value of the article or its key takeaway. Do not provide a new
quote, just repeat the exact text from the article. The summary and quote should be
in the same language as the article.

## TONE & STYLE
* Use concise, neutral, and professional language.
* Avoid opinions or emotive wording.

## OUTPUT FORMAT (return ONLY valid HTML)
<p>{One-sentence title}</p>
<ul>
<li>🗒️ {Theme 1}: {5-10-word summary}</li>
<li>📌 {Theme 2}: {5-10-word summary}</li>
<li>💡 {Theme 3}: {5-10-word summary}</li>
<!-- Optionally add up to 2 more items following the same pattern -->
</ul>
<blockquote>
{Important or representative quote from the article}
</blockquote>

## SUMMARY LENGTH
* ≤ 30 total words.
* 3-5 list items, each 5-10 words.

## CONSTRAINTS
* No extra text outside the specified HTML.
* Follow all length and structure rules exactly.

## EXAMPLE (reference only)
<p>China's exports to Russia are decreasing due to U.S. secondary sanctions and export controls.</p>
<ul>
<li>📊 China's exports: to Russia Exports of ball bearings and Tier 1 items have decreased significantly.</li>
<li>🔨 U.S. economic: tools Secondary sanctions and export controls are influencing China's trade with Russia.</li>
<li>👥 China's role: China is slowly shifting to the coalition side in the economic war against Russia.</li>
</ul>
<blockquote>
China's exports to Russia are decreasing due to U.S. secondary sanctions and export controls. This is a sign of China's slow shift to the coalition side in the economic war against Russia.
</blockquote>
`;

const DOMPurify = createDomPurify(new JSDOM("<!DOCTYPE html>").window);

const addGenerationInformation = (
	model: string,
	date: string,
	message: string,
) => {
	const generationMessage = `<p><em>Generated on ${date} using ${model}</em></p>${message}`;
	return generationMessage;
};

export async function summarize(text: string): Promise<string> {
	if (!AI_ENABLED || !text) {
		return "";
	}
	const response = await fetchCompletion(
		systemPrompt,
		`<article>${text}</article>`,
		"minimal",
	);
	if (!response) {
		return "";
	}
	const message = response.choices[0].message.content;
	if (!message) {
		throw new Error("No message returned from AI endpoint");
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
