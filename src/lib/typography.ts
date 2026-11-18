/**
 * French typography, as a constant.
 *
 * French puts a non-breaking space before `:`, `;`, `!` and `?`, and inside the
 * « guillemets », so that a line never opens on the punctuation that closes the
 * clause. The character is named once here: a page interpolates it instead of
 * spelling the entity again, and the duplicate sentence cannot disagree with
 * itself.
 *
 * Pure: no Astro, no DOM, no I/O.
 */

/** A non-breaking space, U+00A0. */
export const NBSP = '\u00a0';
