/**
 * Copyright (c) Refactoring UI Inc.
 *
 * This License Agreement (“the Agreement”) between you, the licensee, and Refactoring UI Inc. (the “Company”), a corporation organized and existing under the laws of Ontario.  The Company owns the icons (the “Product”) delivered under this Agreement. This Agreement grants you a non-exclusive, non-transferable right to use and incorporate the Product in personal and commercial projects.
 *
 * You agree as follows:
 *
 * 1.  Scope of use
 *     1. Use and incorporate the Product in personal and commercial projects including web applications, websites, native mobile applications, and printed materials, etc.
 *     2. You may incorporate the Product in open-source projects, and are granted permission to include the Product in publicly readable repositorities as needed.
 *     3. You may modify the Product to better serve your projects.
 *     4. You are granted unlimited usage of the Product.
 *     5. If an organization is the licensee, all employees of the organization may use the same license.
 *
 * 2.  Limitations and non-use
 *     1. You may not redistribute, sublicense or resell the Product.
 *     2. You may not distribute, license or sell modified versions of the Product.
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import type { FC } from "hono/jsx";

export const InboxDownload: FC = ({ ...props }) => (
	<svg
		role="img"
		aria-label="An inbox with an arrow pointing down"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...props}
	>
		<path
			className="primary"
			d="M8 5H5v10h2a2 2 0 0 1 2 2c0 1.1.9 2 2 2h2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h2V5h-3a1 1 0 0 1 0-2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3a1 1 0 1 1 0 2z"
		/>
		<path
			className="secondary"
			d="M11 10.59V4a1 1 0 0 1 2 0v6.59l1.3-1.3a1 1 0 0 1 1.4 1.42l-3 3a1 1 0 0 1-1.4 0l-3-3a1 1 0 0 1 1.4-1.42l1.3 1.3z"
		/>
	</svg>
);

export const BookClosed: FC = ({ ...props }) => (
	<svg
		role="img"
		aria-label="A closed book"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...props}
	>
		<g>
			<path
				className="secondary"
				d="M5 3h2l5 2 5-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2z"
			/>
			<path
				className="primary"
				d="M7 3h10v11a1 1 0 0 1-1.45.9L12 13.11l-3.55 1.77A1 1 0 0 1 7 14V3z"
			/>
		</g>
	</svg>
);

export const Attach: FC = ({ ...props }) => (
	<svg
		role="img"
		aria-label="A paperclip"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...props}
	>
		<path
			className="secondary"
			d="M20.12 11.95l-6.58 6.59a5 5 0 1 1-7.08-7.07l6.59-6.6a3 3 0 0 1 4.24 4.25l-6.58 6.59a1 1 0 1 1-1.42-1.42l6.59-6.58a1 1 0 0 0-1.42-1.42l-6.58 6.59a3 3 0 0 0 4.24 4.24l6.59-6.58a5 5 0 0 0-7.08-7.08l-6.58 6.6a7 7 0 0 0 9.9 9.9l6.59-6.6a1 1 0 0 0-1.42-1.4z"
		/>
	</svg>
);

export const Hourglass: FC = ({ ...props }) => (
	<svg
		role="img"
		aria-label="An hour glass"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...props}
	>
		<path
			class="primary"
			d="M19 20h1a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2h1c0-1.8.68-3.58 2.05-4.95L9 13.1v-2.2L7.05 8.95A6.98 6.98 0 0 1 5 4H4a1 1 0 1 1 0-2h16a1 1 0 0 1 0 2h-1c0 1.8-.68 3.58-2.05 4.95L15 10.9v2.2l1.95 1.95A6.98 6.98 0 0 1 19 20z"
		/>
		<path
			class="secondary"
			d="M17 20H7l2.83-2.83A4 4 0 0 0 11 14.34v-4.27L8.46 7.54a5 5 0 0 1-.95-1.33c.17-.06.33-.13.49-.21a4.47 4.47 0 0 1 4 0c1.26.63 2.74.63 4 0 .23-.11.46-.2.7-.28a5 5 0 0 1-1.16 1.82L13 10.07v4.27a4 4 0 0 0 1.17 2.83L17 20z"
		/>
	</svg>
);

export const CloseCircle: FC = ({ ...props }) => (
	<svg
		role="img"
		aria-label="A circle with an X in the center"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...props}
	>
		<circle cx="12" cy="12" r="10" class="primary" />
		<path
			class="secondary"
			d="M13.41 12l2.83 2.83a1 1 0 0 1-1.41 1.41L12 13.41l-2.83 2.83a1 1 0 1 1-1.41-1.41L10.59 12 7.76 9.17a1 1 0 0 1 1.41-1.41L12 10.59l2.83-2.83a1 1 0 0 1 1.41 1.41L13.41 12z"
		/>
	</svg>
);

export const Duplicate: FC = ({ ...props }) => (
	<svg
		role="img"
		aria-label="Two overlapping squares"
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 24 24"
		{...props}
	>
		<rect width="14" height="14" x="3" y="3" class="secondary" rx="2" />
		<rect width="14" height="14" x="7" y="7" class="primary" rx="2" />
	</svg>
);
