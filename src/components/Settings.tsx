import type { FC } from "hono/jsx";
import Button from "../components/Button";
import Input from "./Input";

const Settings: FC = () => (
	<form
		className="flex flex-col gap-4 items-start text-black dark:text-base-200"
		id="settings-form"
	>
		<label className="flex flex-col items-start">
			<span>AI model</span>
			<select
				name="model"
				className="border border-base-100 rounded dark:border-base-900 p-1 bg-paper hover:bg-base-150 active:bg-base-100 dark:bg-base-900 hover:dark:bg-base-800 active:dark:bg-base-850"
			>
				<option value="gpt-4o-mini">GPT-4o mini</option>
			</select>
		</label>
		{/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
		<label className="flex flex-col items-start">
			<span>API key</span>
			<Input type="text" name="apiKey" />
		</label>
		<div
			id="status"
			className="h-4 -mt-3 transition-opacity opacity-0 text-green-600 dark:text-green-400"
		>
			✔︎ Saved!
		</div>
		<div className="flex items-center gap-2">
			<Button type="submit">Save</Button>
			<Button type="reset">Reset</Button>
		</div>
	</form>
);

export default Settings;
