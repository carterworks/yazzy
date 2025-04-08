window.addEventListener("DOMContentLoaded", () => {
	const $jsOnly = document.querySelectorAll(".js-only");
	for (const $element of $jsOnly) {
		$element.classList.remove("js-only");
	}
});

function initCopyButton() {
	const copyButton = document.getElementById("copy-markdown");
	const markdownContent =
		document.getElementById("obsidian-script").dataset.markdownContent;
	if (!markdownContent) {
		throw new Error("Missing markdown content or obsidian uri");
	}
	if (!copyButton) {
		return;
	}
	copyButton.addEventListener("click", () => {
		navigator.clipboard.writeText(markdownContent);
	});
}

function initSaveToObsidian() {
	const obsidianButton = document.getElementById("save-to-obsidian");
	const markdownContent =
		document.getElementById("obsidian-script").dataset.markdownContent;
	const obsidianUri =
		document.getElementById("obsidian-script").dataset.obsidianUri;
	if (!markdownContent || !obsidianUri) {
		throw new Error("Missing markdown content or obsidian uri");
	}
	if (!obsidianButton) {
		return;
	}

	// Create a new button element
	const newButton = document.createElement("button");

	// Copy all attributes from the anchor to the button except href
	for (const attr of obsidianButton.attributes) {
		if (attr.name !== "href") {
			newButton.setAttribute(attr.name, attr.value);
		}
	}

	// Copy the inner content
	newButton.innerHTML = obsidianButton.innerHTML;

	// Replace the anchor with the button
	obsidianButton.parentNode.replaceChild(newButton, obsidianButton);

	// Update our reference to point to the new button
	newButton.addEventListener("click", (e) => {
		e.preventDefault();
		navigator.clipboard.writeText(markdownContent);
		window.open(obsidianUri, "_blank");
	});
}

initCopyButton();
initSaveToObsidian();
