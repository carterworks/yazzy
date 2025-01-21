import type { FC } from "hono/jsx";

const ArticleMinimap: FC<{ classes?: string; selector: string }> = ({
	classes = "",
	selector,
}) => {
	return <wc-minimap className={classes} data-article-selector={selector} />;
};

export default ArticleMinimap;
