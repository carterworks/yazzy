/**
 * Based on https://github.com/Kakulukian/youtube-transcript/
 *
 * The MIT License (MIT)
 *
 * Copyright (c) 2024 Sylvestre Bouchot
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { JSDOM } from "jsdom";
const RE_YOUTUBE =
	/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
const USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)";
const RE_XML_TRANSCRIPT =
	/<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

export class YoutubeTranscriptError extends Error {
	constructor(message: string) {
		super(`[YoutubeTranscript] 🚨 ${message}`);
	}
}

export class YoutubeTranscriptTooManyRequestError extends YoutubeTranscriptError {
	constructor() {
		super(
			"YouTube is receiving too many requests from this IP and now requires solving a captcha to continue",
		);
	}
}

export class YoutubeTranscriptVideoUnavailableError extends YoutubeTranscriptError {
	constructor(videoId: string) {
		super(`The video is no longer available (${videoId})`);
	}
}

export class YoutubeTranscriptDisabledError extends YoutubeTranscriptError {
	constructor(videoId: string) {
		super(`Transcript is disabled on this video (${videoId})`);
	}
}

export class YoutubeTranscriptNotAvailableError extends YoutubeTranscriptError {
	constructor(videoId: string) {
		super(`No transcripts are available for this video (${videoId})`);
	}
}

export class YoutubeTranscriptNotAvailableLanguageError extends YoutubeTranscriptError {
	constructor(lang: string, availableLangs: string[], videoId: string) {
		super(
			`No transcripts are available in ${lang} this video (${videoId}). Available languages: ${availableLangs.join(
				", ",
			)}`,
		);
	}
}

export class YoutubeTranscriptBotBlockError extends YoutubeTranscriptError {
	constructor(videoId: string) {
		super(
			`YouTube blocked the request to this video (${videoId}) as part of its bot protections.`,
		);
	}
}

export interface TranscriptConfig {
	lang?: string;
}
export interface TranscriptResponse {
	text: string;
	duration: number;
	offset: number;
	lang?: string;
}
export interface VideoInfo {
	title: string;
	published?: Date;
	author: string | null;
	createdAt?: Date;
	url: string;
	thumbnailUrl?: string;
	transcript: TranscriptResponse[];
	id: string;
}
type SchemaObject = { [key: string]: string | string[] | SchemaObject };

function objElementToJsObject(schemaObj: Element | null): SchemaObject {
	if (!schemaObj) {
		return {};
	}
	// for each child elemnt of the video object, get the key from the itemprop attribute and the value which is content attribute or a href.
	// If the element has achildern, then the object is a nested object.
	// If the item has commas, then it is an array.
	const obj: SchemaObject = {};
	for (const child of schemaObj.children) {
		const key = child.getAttribute("itemprop");
		const value = child.getAttribute("content") ?? child.getAttribute("href");
		if (child.children.length > 0 && key !== null) {
			obj[key] = objElementToJsObject(child);
		} else if (key && value) {
			obj[key] = value;
		}
	}
	return obj;
}

/**
 * Fetch transcript from YTB Video
 * @param videoId Video url or video identifier
 * @param config Get transcript in a specific language ISO
 */
export async function fetchTranscript(
	videoId: string,
	config?: TranscriptConfig,
): Promise<VideoInfo> {
	const identifier = retrieveVideoId(videoId);
	const videoPageResponse = await fetch(
		`https://www.youtube.com/watch?v=${identifier}`,
		{
			headers: {
				...(config?.lang && { "Accept-Language": config.lang }),
				"User-Agent": USER_AGENT,
			},
		},
	);
	const videoPageBody = await videoPageResponse.text();

	const splittedHTML = videoPageBody.split('"captions":');

	if (splittedHTML.length <= 1) {
		if (videoPageBody.includes('class="g-recaptcha"')) {
			throw new YoutubeTranscriptTooManyRequestError();
		}
		if (!videoPageBody.includes('"playabilityStatus":')) {
			throw new YoutubeTranscriptVideoUnavailableError(videoId);
		}
		if (videoPageBody.includes("Sign in to confirm you’re not a bot")) {
			throw new YoutubeTranscriptBotBlockError(videoId);
		}
		throw new YoutubeTranscriptDisabledError(videoId);
	}

	const captions = (() => {
		try {
			return JSON.parse(
				splittedHTML[1].split(',"videoDetails')[0].replace("\n", ""),
			);
		} catch (e) {
			return undefined;
		}
	})()?.playerCaptionsTracklistRenderer;

	if (!captions) {
		throw new YoutubeTranscriptDisabledError(videoId);
	}

	if (!("captionTracks" in captions)) {
		throw new YoutubeTranscriptNotAvailableError(videoId);
	}

	if (
		config?.lang &&
		!captions.captionTracks.some(
			(track: { languageCode: string }) => track.languageCode === config?.lang,
		)
	) {
		throw new YoutubeTranscriptNotAvailableLanguageError(
			config?.lang,
			captions.captionTracks.map(
				(track: { languageCode: string }) => track.languageCode,
			),
			videoId,
		);
	}

	const transcriptURL = (
		config?.lang
			? captions.captionTracks.find(
					(track: { languageCode: string }) =>
						track.languageCode === config?.lang,
				)
			: captions.captionTracks[0]
	).baseUrl;

	const transcriptResponse = await fetch(transcriptURL, {
		headers: {
			...(config?.lang && { "Accept-Language": config.lang }),
			"User-Agent": USER_AGENT,
		},
	});
	if (!transcriptResponse.ok) {
		throw new YoutubeTranscriptNotAvailableError(videoId);
	}
	const transcriptBody = await transcriptResponse.text();
	const results = [...transcriptBody.matchAll(RE_XML_TRANSCRIPT)];

	const transcript = results.map((result) => ({
		text: result[3],
		duration: Number.parseFloat(result[2]),
		offset: Number.parseFloat(result[1]),
		lang: config?.lang ?? captions.captionTracks[0].languageCode,
	}));
	const page = new JSDOM(videoPageBody);
	try {
		const videoObject = objElementToJsObject(
			page.window.document.querySelector(
				'[itemtype="http://schema.org/VideoObject"]',
			),
		);

		const title = (videoObject?.["name"] as string) ?? "YouTube Video";
		const author =
			videoObject?.["author"] &&
			typeof videoObject["author"] === "object" &&
			"name" in videoObject["author"]
				? (videoObject["author"] as { name: string }).name
				: null;
		const published = videoObject?.["datePublished"]
			? new Date(videoObject["datePublished"] as string)
			: undefined;
		const createdAt = videoObject?.["uploadDate"]
			? new Date(videoObject["uploadDate"] as string)
			: undefined;
		const thumbnailUrl = videoObject?.["thumbnailUrl"] as string;
		return {
			title,
			author,
			published,
			createdAt,
			url: `https://www.youtube.com/watch?v=${identifier}`,
			transcript,
			thumbnailUrl,
			id: identifier,
		};
	} finally {
		// CRITICAL: Close JSDOM window to free memory
		page.window.close();
	}
}

/**
 * Retrieve video id from url or string
 * @param videoId video url or video id
 */
function retrieveVideoId(videoId: string) {
	if (videoId.length === 11) {
		return videoId;
	}
	const matchId = videoId.match(RE_YOUTUBE);
	if (matchId?.length) {
		return matchId[1];
	}
	throw new YoutubeTranscriptError("Impossible to retrieve Youtube video ID.");
}
