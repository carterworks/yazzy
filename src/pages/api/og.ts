import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import type { ReactNode } from "react";
import satori from "satori";
import { html } from "satori-html";
import { cache } from "../../services/cache";

// Scissors icon SVG path (from scissors.svg)
const scissorsPath =
	"M526 304q0 -83 50 -139t123 -56q55 0 100.5 31.5t73 83.5t27.5 115q0 82 -49 138t-120 56q-85 0 -145 -67t-60 -162zM599 304q0 64 38.5 109.5t93.5 45.5q40 0 68 -34.5t28 -85.5q0 -63 -38.5 -109.5t-89.5 -46.5q-42 0 -71 34.5t-29 86.5zM1369 870q0 -28 -20 -48t-50 -20q-28 0 -48 19.5t-20 48.5q0 28 19.5 48.5t49.5 20.5q28 0 48.5 -20t20.5 -49zM758 666q90 0 147.5 8t93.5 28l96 -180q-72 -71 -72 -164q0 -107 -43.5 -193t-118 -136.5t-168.5 -50.5q-85 0 -151.5 40.5t-104 112.5t-37.5 167q0 98 50 182t132 135t176 51zM758 746q-117 0 -216.5 -62t-160.5 -164t-61 -222q0 -117 48 -207t132.5 -141.5t192.5 -51.5q116 0 208.5 61.5t147 165.5t54.5 233q0 42 21.5 73t72.5 73l-184 342q-43 -64 -97.5 -82t-157.5 -18zM970 779l68 -43l719 1143q43 -21 43 -65q0 -23 -10 -56.5t-31 -87.5l-334 -873l-281 -232l53 -61l296 245l340 891q21 55 32 99t11 79q0 59 -35 97t-115 63zM1842 666q95 0 176.5 -51t131.5 -135t50 -182q0 -95 -37.5 -167t-103.5 -112.5t-152 -40.5q-93 0 -168 50.5t-118.5 136.5t-43.5 193q0 93 -72 164l96 180q36 -20 93.5 -28t147.5 -8zM1842 746q-103 0 -157.5 18t-97.5 82l-184 -342q51 -42 72.5 -73t21.5 -73q0 -129 54.5 -233t147.5 -165.5t208 -61.5q109 0 193 51.5t132 141.5t48 207q0 120 -60.5 222t-160.5 164t-217 62zM1328 1257l-454 721q-80 -25 -115 -63t-35 -97q0 -35 11 -79t32 -99l304 -796l53 84l-283 742q-21 54 -31 87.5t-10 56.5q0 44 43 65l437 -697zM1264 618l139 -114l55 59l-129 106zM1485 858l77 -120l67 43l-109 169zM2074 304q0 95 -59.5 162t-145.5 67q-71 0 -120 -56t-49 -138q0 -63 27.5 -115t73.5 -83.5t100 -31.5q73 0 123 56t50 139zM2001 304q0 -52 -29 -86.5t-71 -34.5q-51 0 -89.5 46.5t-38.5 109.5q0 51 28 85.5t68 34.5q55 0 93.5 -45.5t38.5 -109.5z";

// Flexoki color scheme
const colors = {
	light: {
		bg: "#fffcf0",
		text: "#100f0f",
		textMuted: "#6f6e69",
		textFaint: "#b7b5ac",
	},
	dark: {
		bg: "#100f0f",
		text: "#cecdc3",
		textMuted: "#878580",
		textFaint: "#575653",
	},
};

// Cache fonts in memory
let fontDataCache: { inter: ArrayBuffer; sourceSerif: ArrayBuffer } | null =
	null;

async function loadFonts() {
	if (fontDataCache) return fontDataCache;

	// Load Inter (sans-serif) and Source Serif Pro (serif) from Google Fonts
	const [interResponse, sourceSerifResponse] = await Promise.all([
		fetch(
			"https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_0ew.woff",
		),
		fetch(
			"https://fonts.gstatic.com/s/sourceserif4/v8/vEFy2_tTDB4M7-auWDN0ahZJW3IX2ih5nk3AucvUHf6OAVIJmeUDygwjipdqrhxXD-wGvjU.woff",
		),
	]);

	fontDataCache = {
		inter: await interResponse.arrayBuffer(),
		sourceSerif: await sourceSerifResponse.arrayBuffer(),
	};

	return fontDataCache;
}

function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	// Truncate at word boundary
	const truncated = text.substring(0, maxLength);
	const lastSpace = truncated.lastIndexOf(" ");
	return `${truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength)}...`;
}

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export const GET: APIRoute = async ({ url }) => {
	const articleUrl = url.searchParams.get("url");
	const theme = url.searchParams.get("theme") || "light";

	if (!articleUrl) {
		return new Response("Missing url parameter", { status: 400 });
	}

	// Get article from cache
	const article = await cache.getArticle(articleUrl);
	if (!article) {
		return new Response("Article not found", { status: 404 });
	}

	const fonts = await loadFonts();
	const c = theme === "dark" ? colors.dark : colors.light;
	const hostname = new URL(article.url).hostname.replace("www.", "");
	const title = escapeHtml(truncateText(article.title || "Untitled", 100));
	const author = article.author ? escapeHtml(article.author) : null;

	// Build the OG image using HTML template
	const markup = html`
		<div style="height: 100%; width: 100%; display: flex; flex-direction: column; justify-content: space-between; background-color: ${c.bg}; padding: 60px;">
			<div style="display: flex; align-items: center;">
				<span style="font-size: 24px; color: ${c.textMuted}; font-family: Inter;">${hostname}</span>
			</div>
			<div style="display: flex; flex-direction: column; gap: 20px; flex: 1; justify-content: center;">
				<div style="font-size: 56px; font-family: Source Serif; font-weight: 600; color: ${c.text}; line-height: 1.2; max-width: 1000px;">${title}</div>
				${author ? `<div style="font-size: 28px; color: ${c.textMuted}; font-family: Inter;">by ${author}</div>` : ""}
			</div>
			<div style="display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
				<svg width="20" height="16" viewBox="-10 0 2610 2048" style="color: ${c.textFaint};">
					<path fill="${c.textFaint}" d="${scissorsPath}" />
				</svg>
				<span style="font-size: 20px; color: ${c.textFaint}; font-family: Inter;">Yazzy</span>
			</div>
		</div>
	`;

	const svg = await satori(markup as ReactNode, {
		width: 1200,
		height: 630,
		fonts: [
			{
				name: "Inter",
				data: fonts.inter,
				weight: 400,
				style: "normal",
			},
			{
				name: "Source Serif",
				data: fonts.sourceSerif,
				weight: 600,
				style: "normal",
			},
		],
	});

	// Convert SVG to PNG
	const resvg = new Resvg(svg, {
		background: c.bg,
		fitTo: {
			mode: "width",
			value: 1200,
		},
	});

	const pngData = resvg.render();
	const pngBuffer = pngData.asPng();

	return new Response(new Uint8Array(pngBuffer), {
		headers: {
			"Content-Type": "image/png",
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
};
