import { type FC, Fragment } from "hono/jsx";
import Button from "../components/Button";
import Input from "../components/Input";
import RecentArticles from "../components/RecentArticles";
import BasePage from "../layouts/BasePage";
import type { ReadablePage } from "../types";

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

const IndexPage: FC<{ recentArticles: ReadablePage[] }> = ({
	recentArticles,
}) => (
	<BasePage title="yazzy" head={<Head />} classes="space-y-2">
		<header className="space-y-2">
			<p className="">
				Tired of popups, ads, and other distractions on your page? Just put the
				URL in the box below and yazzy will clean it up so you can focus. You
				can even save it as a Markdown file to keep forever.
			</p>
		</header>
		<form action="/api/clip" method="get" className="flex gap-1 items-center">
			<Input
				type="url"
				id="url"
				name="url"
				required
				placeholder="https://paulgraham.com/submarine.html"
			/>
			<Button type="submit" classes="px-4" variant="primary">
				Clip
			</Button>
		</form>
		<RecentArticles articles={recentArticles} />
	</BasePage>
);
export default IndexPage;
