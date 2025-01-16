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
	"bg-base-100 hover:bg-base-150 active:bg-base-200",
	"dark:bg-base-900 hover:dark:bg-base-850 active:dark:bg-base-800",
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
