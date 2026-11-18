/**
 * `robots.txt`: point crawlers at the sitemap, and keep them out of `/-/`.
 *
 * Two directives, and deliberately no third one.
 *
 * There is no `Disallow: /`. A blanket disallow would stop the crawl, which is
 * the opposite of what this site wants: the authored fiches are meant to be
 * found. It would also be self-defeating. Keeping generated fiches out of the
 * index is the job of the per-page `<meta name="robots" content="noindex">`
 * they carry, and a crawler has to be allowed to fetch a page to read that tag.
 * A `Disallow` only prevents fetching; it never removes an already-indexed
 * page. So the exclusion lives in the documents, and robots.txt stays out of
 * the way.
 *
 * `Disallow: /-/` remains because it is honest: `/-/` is the reserved prefix
 * for utility routes (`/-/random`), nothing indexable lives under it, and the
 * prefix is never served by the catch-all, so no visitor is sent there by a
 * mistyped URL. The random route is `noindex` anyway; the rule saves a crawl,
 * not an index entry.
 */
import type { APIRoute } from 'astro';

const DEFAULT_SITE = 'https://onditpas.fr';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL(DEFAULT_SITE);
  const sitemap = new URL('/sitemap.xml', base).href;

  const body = `User-agent: *
Disallow: /-/
Sitemap: ${sitemap}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
