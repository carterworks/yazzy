import { type FC, Fragment } from "hono/jsx";
import Button from "../components/Button";
import Input from "../components/Input";
import BasePage from "../layouts/BasePage";
import { ReadablePage } from "../types";
import RecentArticles from "../components/RecentArticles";

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
	<BasePage title="yazzy" head={<Head />}>
		<header className="mb-4">
			<p className="">
				Tired of popups, ads, and other distractions on your page? Just put the
				URL in the box below and yazzy will clean it up so you can focus. You
				can even save it as a Markdown file to keep forever.
			</p>
		</header>
		<form
			action="/api/clip"
			method="get"
			className="flex gap-1 items-center mb-4"
		>
			<Input
				type="url"
				id="url"
				name="url"
				required
				placeholder="https://paulgraham.com/submarine.html"
			/>
			<Button type="submit" classes="px-4">
				{" "}
				Clip{" "}
			</Button>
		</form>
		<RecentArticles articles={recentArticles} />
	</BasePage>
);
export default IndexPage;
