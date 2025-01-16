import type { FC } from "hono/jsx";

const ArticleMinimap: FC<{ classes?: string; selector: string }> = ({
	classes = "",
	selector,
}) => {
	return <wc-minimap class={classes} data-article-selector={selector} />;
};

export default ArticleMinimap;
