import type { FC, PropsWithChildren } from "hono/jsx";

type Variant = "primary" | "secondary";
interface LinkProps {
	type: "link";
	href: string;
}
interface ButtonProps {
	type: "button" | "submit" | "reset";
}
interface CommonProps {
	extraClasses?: string;
	variant?: Variant;
	[key: string]: unknown;
}
type Props = (LinkProps | ButtonProps) & CommonProps;

function isLink(props: Props): props is LinkProps & CommonProps {
	return "href" in props;
}

const classes = [
	"px-2 py-1",
	"rounded",
	"transition",
	"text-center",
	"border",
	"cursor-pointer",
] as const;

const variantClasses: Record<Variant, string> = {
	primary:
		"bg-base-900 hover:bg-base-800 active:bg-base-850 border-base-900 text-paper dark:bg-base-900 dark:hover:bg-base-800 dark:active:bg-base-850 dark:border-base-900",
	secondary:
		"bg-paper hover:bg-base-150 active:bg-base-100 border-base-100 dark:bg-base-900 dark:hover:bg-base-800 dark:active:bg-base-850 dark:border-base-900",
};

const Button: FC<PropsWithChildren<Props>> = (props) => {
	const { variant = "secondary", extraClasses, ...rest } = props;
	if (isLink(rest)) {
		return (
			<a
				className={[...classes, variantClasses[variant], extraClasses].join(
					" ",
				)}
				{...rest}
			>
				{props.children}
			</a>
		);
	}
	return (
		<button
			className={[...classes, variantClasses[variant], extraClasses].join(" ")}
			{...(rest as Partial<ButtonProps>)}
		>
			{props.children}
		</button>
	);
};

export default Button;
