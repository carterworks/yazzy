function initSettingsForm() {
	const form = document.getElementById("settings-form");
	if (!form) {
		throw new Error("Form not found");
	}
	const model = form.querySelector("select[name=model]");
	const apiKey = form.querySelector("input[name=apiKey]");
	if (!model || !apiKey) {
		throw new Error("Form elements not found");
	}

	const cookie = document.cookie
		.split(/;\s*/)
		.find((c) => c.toLocaleLowerCase().startsWith("authorization="));
	if (cookie) {
		const [modelValue, apiKeyValue] = atob(cookie.split("=")[1]).split("=");
		model.value = modelValue;
		apiKey.value = apiKeyValue;
	}

	const statusText = form.querySelector("#status");
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		event.stopPropagation();
		const apiKeyValue = apiKey.value;

		statusText?.classList.toggle("opacity-100");
		setTimeout(() => {
			statusText?.classList.toggle("opacity-100");
		}, 3000);

		if (!apiKeyValue) {
			// delete the cookie
			document.cookie = `Authorization=; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure; Path=/; Domain=${window.location.hostname};`;
			apiKey.value = "";
			return;
		}
		const value = btoa(`${model.value}=${apiKey.value}`);
		document.cookie = `Authorization=${value}; max-age=31536000; SameSite=Strict; Secure; Path=/; Domain=${window.location.hostname};`;
	});
}
initSettingsForm();
