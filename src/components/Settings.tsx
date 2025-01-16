import type { FC, PropsWithChildren } from "hono/jsx";
import Button from "../components/Button";

const Settings: FC = () => (
	<form className="flex flex-col gap-4 items-start" id="settings-form">
		<label className="flex flex-col items-start">
			<span>AI model</span>
			<select name="model" className="border rounded-md py-1 px-4">
				<option value="gpt-4o-mini">GPT-4o mini</option>
			</select>
		</label>
		<label className="flex flex-col items-start">
			<span>API key</span>
			<input
				type="text"
				name="apiKey"
				className="border focus:border-transparent block w-full rounded-md focus:ring-0 py-1 px-4 transition"
			/>
		</label>
		<div
			id="status"
			className="h-4 -mt-3 transition-opacity opacity-0 dark:text-green-400 text-green-700"
		>
			✔︎ Saved!
		</div>
		<div className="flex items-center gap-2">
			<Button type="submit" classes="py-1 px-6">
				Save
			</Button>
			<Button
				type="reset"
				classes="py-1 px-6 text-red-700 border-red-700 dark:text-red-400 dark:border-red-400"
			>
				Reset
			</Button>
		</div>
	</form>
);

export default Settings;
