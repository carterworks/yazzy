import type { FC, PropsWithChildren } from "hono/jsx";
import Button from "./Button";

function stringToBase64(str: string): string {
	const bytes = new TextEncoder().encode(str);
	const binString = Array.from(bytes, (byte) =>
		String.fromCodePoint(byte),
	).join("");
	return btoa(binString);
}

const DownloadAs: FC<
	PropsWithChildren<{
		contents: string;
		filename: string;
		[key: string]: unknown;
	}>
> = ({ children, contents, filename, ...otherProps }) => {
	const type = `text/${filename.endsWith(".md") ? "markdown" : "plain"};charset=utf-8`;
	const url = `data:${type};base64,${stringToBase64(contents)}`;

	return (
		<Button {...otherProps} download={filename} type="link" href={url}>
			{children}
		</Button>
	);
};

export default DownloadAs;
