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

initCopyButton();
