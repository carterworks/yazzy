// @ts-check

/**
 * @typedef {Object} MinimapHeading
 * @property {Element} element
 * @property {string | null} text
 * @property {string} id
 * @property {number} level
 * @property {"active" | "inactive"} status
 *
 * @typedef {(args: { heading: MinimapHeading }) => void} ScrollEventListener
 *
 * @typedef {Object} MinimapTick
 * @property {Element} element
 * @property {Element} link
 * @property {MinimapHeading} heading
 */

class HeadlessMinimap {
	/** @type {ScrollEventListener[]} */
	#onActivateListeners = [];
	/** @type {ScrollEventListener[]} */
	#onDeactivateListeners = [];
	/** @type {MinimapHeading[]} */
	#headings = [];
	/** @type {MinimapHeading[]} */
	get headings() {
		return this.#headings;
	}

	/**
	 * @param {Object} params
	 * @param {Element} params.article
	 * @param {boolean} [params.linkify=true]
	 */
	constructor({ article, linkify = true }) {
		const headingElements = Array.from(
			article.querySelectorAll("h1, h2, h3, h4, h5, h6"),
		);
		const minHeadingLevel = Math.min(
			...headingElements.map((el) => Number.parseInt(el.tagName[1], 10)),
		);

		this.#headings = headingElements.map((el) => {
			/** @type {MinimapHeading} */
			const h = {
				element: el,
				text: el.textContent,
				id: el.id,
				level: Number.parseInt(el.tagName[1], 10) - minHeadingLevel + 1,
				status: "inactive",
			};
			return h;
		});

		const observer = new IntersectionObserver(
			(entries) => {
				const [entry] = entries;
				const previousActiveHeader = this.#headings.find(
					(h) => h.status === "active",
				);
				if (!entry.isIntersecting) {
					return;
				}
				const activeHeading = this.#headings.find(
					(h) => h.element === entry.target,
				);
				if (!activeHeading) {
					return;
				}
				activeHeading.status = "active";
				if (previousActiveHeader && previousActiveHeader !== activeHeading) {
					previousActiveHeader.status = "inactive";
					this.#onDeactivate({ heading: previousActiveHeader });
				}
				this.#onActivate({ heading: activeHeading });
			},
			{
				rootMargin: "0px 0px -100% 0px",
			},
		);

		for (const h of this.#headings) {
			observer.observe(h.element);
		}

		if (linkify) {
			this.#headings
				.filter((h) => !h.id)
				.forEach((h, i) => {
					let newId = `heading-${i}`;
					if (h.element.textContent) {
						newId = h.element.textContent
							.toLowerCase()
							.replaceAll(/\s+/g, "-")
							.replaceAll(/[^a-z0-9-]/g, "");
					}
					h.id = newId;
					h.element.id = newId;
				});
		}
	}

	/**
	 * @param {ScrollEventListener} listener
	 */
	addOnActivate(listener) {
		this.#onActivateListeners.push(listener);
	}
	/**
	 * @type {ScrollEventListener}
	 */
	#onActivate({ heading }) {
		for (const listener of this.#onActivateListeners) {
			listener({ heading });
		}
	}
	/**
	 * @param {ScrollEventListener} listener
	 */
	addOnDeactivate(listener) {
		this.#onDeactivateListeners.push(listener);
	}
	/**
	 * @type {ScrollEventListener}
	 */
	#onDeactivate({ heading }) {
		for (const listener of this.#onDeactivateListeners) {
			listener({ heading });
		}
	}
}

class ArticleMinimap extends HTMLElement {
	/** @type {HeadlessMinimap?} */
	#minimap = null;
	#vibrate = true;
	/** @type {MinimapTick[]} */
	#ticks = [];
	#activeState = "●";
	#inactiveState = "○";
	connectedCallback() {
		const articleSelector = this.dataset.articleSelector;
		if (!articleSelector) {
			throw new Error(
				"ArticleMinimap: Missing required data-article-selector attribute",
			);
		}
		const article = document.querySelector(articleSelector);
		if (!article) {
			console.warn(
				`ArticleMinimap: No article found with selector "${articleSelector}"`,
			);
			return;
		}
		this.#activeState = this.dataset.activeState || this.#activeState;
		this.#inactiveState = this.dataset.inactiveState || this.#inactiveState;
		this.#vibrate = this.dataset.vibrate
			? this.dataset.vibrate === "true"
			: true;
		const linkify = this.dataset.linkify
			? this.dataset.linkify === "true"
			: true;
		this.#minimap = new HeadlessMinimap({ article, linkify });

		const ol = document.createElement("ol");
		ol.classList.add("minimap");
		this.#ticks = this.#minimap.headings.map((h) => {
			const li = document.createElement("li");
			let inner;
			if (h.id) {
				inner = document.createElement("a");
				inner.href = `#${h.id}`;
			} else {
				inner = document.createElement("span");
			}
			inner.textContent = this.#inactiveState;
			li.appendChild(inner);
			return {
				link: inner,
				element: li,
				heading: h,
			};
		});
		for (const tick of this.#ticks) {
			ol.appendChild(tick.element);
		}
		const shadow = this.attachShadow({ mode: "open" });
		shadow.appendChild(ol);
		shadow.adoptedStyleSheets = [this.#generateStyles()];
		this.#minimap.addOnActivate(this.#onActivate.bind(this));
		this.#minimap.addOnDeactivate(this.#onDeactivate.bind(this));
	}

	/**
	 * @returns {CSSStyleSheet}
	 */
	#generateStyles() {
		const styles = `
ol {
	list-style: none;
	padding: 0;
	margin: 0;
	display: flex;
	flex-direction: row;
	gap: 0.5em;
}
a {
	text-decoration: none;
	color: inherit;
}
@media (min-width: 768px) {
	ol {
		flex-direction: column;
	}
}	
`;
		const sheet = new CSSStyleSheet();
		sheet.replaceSync(styles);
		return sheet;
	}

	/** @type {ScrollEventListener} */
	#onActivate({ heading }) {
		if (this.#vibrate) {
			navigator.vibrate(100);
		}
		const tick = this.#ticks.find((t) => t.heading === heading);
		if (!tick) {
			return;
		}
		tick.link.textContent = this.#activeState;
	}

	/** @type {ScrollEventListener} */
	#onDeactivate({ heading }) {
		const tick = this.#ticks.find((t) => t.heading === heading);
		if (!tick) {
			return;
		}
		tick.link.textContent = this.#inactiveState;
	}
}

// Usage:
// <article-minimap
//    data-article-selector="article"
//    data-linkify="true"
//    data-vibrate="true"
//    data-active-state="●"
//    data-inactive-state="○"
// ></article-minimap>
customElements.define("article-minimap", ArticleMinimap);
