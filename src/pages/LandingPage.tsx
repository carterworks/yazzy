import PageWrapper from "./PageWrapper";

export default function Index({ cssFilename }: { cssFilename: string }) {
	return (
		<PageWrapper pageTitle="yazzy" cssFilename={cssFilename}>
			<header class="mb-4">
				<p class="">
					Tired of popups, ads, and other distractions on your page? Just put
					the URL in the box below and yazzy will clean it up so you can focus.
					You can even save it as a Markdown file to keep forever.
				</p>
			</header>
			<form action="/" method="get" class="flex gap-1 items-center">
				<input
					class="border border-arc-focus focus:bg-arc-backgroundExtra focus:border-transparent block w-full rounded-md bg-arc-cutout focus:ring-0 py-1 px-4 transition"
					type="url"
					id="url"
					name="url"
					required
					placeholder="https://paulgraham.com/submarine.html"
				/>
				<button
					type="submit"
					class=" mx-auto border border-arc-focus py-1 px-6 rounded-lg hover:bg-arc-hover active:bg-arc-focus transition bg-transparent"
				>
					Clip
				</button>
			</form>
		</PageWrapper>
	);
}
