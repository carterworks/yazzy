import type { FC, PropsWithChildren } from "hono/jsx";

interface LinkProps {
	href: string;
}
interface ButtonProps {
	type: "button" | "submit" | "reset";
}
interface CommonProps {
	className?: string;
	[key: string]: unknown;
}
type Props = (LinkProps | ButtonProps) & CommonProps;

const isLink = (props: Props): props is LinkProps & CommonProps => {
	return Boolean((props as LinkProps).href);
};

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
	return isLink(props) ? (
		<a className={[...classes, props.className].join(" ")} {...props}>
			{props.children}
		</a>
	) : (
		<button className={[...classes, props.className].join(" ")} {...props}>
			{props.children}
		</button>
	);
};

export default Button;
