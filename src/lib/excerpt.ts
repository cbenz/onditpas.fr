/**
 * The meta description of a fiche, derived from its Markdown body.
 *
 * A crawler shows one line, so the body loses its markup and its length is
 * capped. The body itself stays the source of truth: nothing else is written
 * for search engines to read.
 *
 * Pure: no Astro, no DOM, no I/O.
 */

/** The first `max` characters of a body, with its markup removed. */
export function excerpt(markdown: string, max = 155): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
