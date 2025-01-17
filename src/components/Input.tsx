import type { FC } from "hono/jsx";

const Input: FC<{
	classes?: string;
	[k: string]: string | boolean | undefined;
}> = ({ classes = "", ...props }) => {
	const className = [
		"border border-base-100 dark:border-base-900 rounded block w-full py-1 px-4 transition",
		classes,
	].join(" ");
	return <input className={className} {...props} />;
};

export default Input;
