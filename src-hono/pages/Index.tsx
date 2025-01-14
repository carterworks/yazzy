import { type FC, Fragment } from "hono/jsx";
import Button from "../components/Button";
import BasePage from "../layouts/BasePage";

const Head: FC = () => (
	<Fragment>
		<meta
			name="description"
			content="A simple tool to clip web pages to plain text."
		/>
		<meta name="keywords" content="clipping, markdown, web pages, plain text" />
		<meta
			property="og:description"
			content="A simple tool to clip web pages to plain text."
		/>
		<meta property="og:title" content="yazzy" />
		<meta property="og:type" content="website" />
	</Fragment>
);

const IndexPage: FC = () => (
	<BasePage title="yazzy" head={Head}>
		<header class="mb-4">
			<p class="">
				Tired of popups, ads, and other distractions on your page? Just put the
				URL in the box below and yazzy will clean it up so you can focus. You
				can even save it as a Markdown file to keep forever.
			</p>
		</header>
		<form action="/api/clip" method="get" class="flex gap-1 items-center mb-4">
			<input
				class="border focus:border-transparent block w-full rounded-md focus:ring-0 py-1 px-4 transition"
				type="url"
				id="url"
				name="url"
				required
				placeholder="https://paulgraham.com/submarine.html"
			/>
			<Button type="submit" class="px-4">
				{" "}
				Clip{" "}
			</Button>
		</form>
		{/* <RecentArticles server:defer>
			<RecentArticles slot="fallback" />
		</RecentArticles> */}
	</BasePage>
);
export default IndexPage;
