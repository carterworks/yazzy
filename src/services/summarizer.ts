const validModels = "gpt-4o-mini";
import createDomPurify from "dompurify";
import { JSDOM } from "jsdom";

const DOMPurify = createDomPurify(new JSDOM("<!DOCTYPE html>").window);

export async function summarize(
	text: string,
	model: string,
	apiKey: string,
): Promise<string> {
	if (!text || !model || !apiKey || !validModels.includes(model)) {
		return "";
	}
	const response = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model,
			messages: [
				{
					role: "system",
					content: `You will receive an article. Summarize it. 
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
<li>📊 China's exports to Russia Exports of ball bearings and Tier 1 items have decreased significantly.</li>
<li>🔨 U.S. economic tools Secondary sanctions and export controls are influencing China's trade with Russia.</li>
<li>👥 China's role China is slowly shifting to the coalition side in the economic war against Russia.</li>
</ul>
`,
				},
				{ role: "user", content: text },
			],
			temperature: 0.7,
		}),
	});
	if (!response.ok) {
		return "";
	}
	const data = await response.json();
	const completion = data.choices[0].message.content;
	return DOMPurify.sanitize(completion);
}
