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
