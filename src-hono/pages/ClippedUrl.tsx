import type { FC } from "hono/jsx";

const ClippedUrlPage: FC<{ url: string }> = ({ url }) => {
	return <div>{url}</div>;
};

export default ClippedUrlPage;
