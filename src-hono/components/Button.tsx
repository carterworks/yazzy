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
	"border",
	"py-1",
	"px-2",
	"rounded",
	"transition",
	"text-center",
	"bg-canvas",
	"hover:brightness-95",
	"dark:hover:brightness-125",
	"active:brightness-105",
	"dark:active:brightness-90",
] as const;

const Button: FC<PropsWithChildren<Props>> = (props) => {
	console.log(props.classes);
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
