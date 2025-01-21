import type { FC } from "hono/jsx";
import BasePage from "../layouts/BasePage";

const ErrorPage: FC<{ message: string }> = ({ message }) => {
	return (
		<BasePage title="Failure to clip">
			<h1 className="text-2xl font-transitional">Failure to clip</h1>
			<p>{message}</p>
		</BasePage>
	);
};

export default ErrorPage;
