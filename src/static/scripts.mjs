window.addEventListener("DOMContentLoaded", () => {
	const $jsOnly = document.querySelectorAll(".js-only");
	for (const $element of $jsOnly) {
		$element.classList.remove("js-only");
	}
});
