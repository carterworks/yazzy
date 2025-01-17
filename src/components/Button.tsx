import type { FC, PropsWithChildren } from "hono/jsx";

interface LinkProps {
	type: "link";
	href: string;
}
interface ButtonProps {
	type: "button" | "submit" | "reset";
}
interface CommonProps {
	classes?: string;
	[key: string]: unknown;
}
type Props = (LinkProps | ButtonProps) & CommonProps;

function isLink(props: Props): props is LinkProps & CommonProps {
	return props.type === "link";
}

const classes = [
	"py-1",
	"px-2",
	"rounded",
	"transition",
	"text-center",
	"border",
	"drop-shadow",
	"cursor-pointer",
	"bg-paper hover:bg-base-150 active:bg-base-100 border-base-100",
	"dark:bg-base-900 hover:dark:bg-base-800 active:dark:bg-base-850 dark:border-base-900",
] as const;

const Button: FC<PropsWithChildren<Props>> = (props) => {
	if (isLink(props)) {
		return (
			<a className={[...classes, props.classes].join(" ")} {...props}>
				{props.children}
			</a>
		);
	}
	return (
		<button className={[...classes, props.classes].join(" ")} {...props}>
			{props.children}
		</button>
	);
};

export default Button;
