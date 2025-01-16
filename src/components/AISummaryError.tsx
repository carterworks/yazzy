import type { FC, PropsWithChildren } from "hono/jsx";

const AISummaryError: FC<PropsWithChildren> = ({ children }) => (
	<div className="bg-slate-200 dark:bg-gray-600 rounded px-4 py-2">
		<h3 className="font-bold mt-0">Failed to retrieve AI summary</h3>
		<p>{children}</p>
	</div>
);

export default AISummaryError;
