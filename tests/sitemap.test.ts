/**
 * Seam S1 — `sitemap.xml` and `robots.txt`.
 *
 * The sitemap is the list of what a search engine may index: the mur and every
 * authored fiche, in both registres, and nothing else. The expected set is
 * derived from `fiches()` and `slugify()`, never hardcoded, so adding a fiche
 * without the sitemap following it fails here.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from '../src/lib/slug.ts';
import { fiches, meta, pageExists, readPage } from './helpers.ts';

const SITE = 'https://onditpas.fr';

/** Every `<loc>` of the document, XML entities decoded, in document order. */
function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) =>
    (match[1] ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
  );
}

/** The path part of an absolute URL, as the build output is laid out. */
function pathOf(url: string): string {
  return new URL(url).pathname;
}

/**
 * What the sitemap must list: the mur, then every authored fiche in both
 * registres. The trailing slash follows the build (`format: 'directory'`) and
 * the canonical tags the pages already carry.
 */
function expectedUrls(): string[] {
  const urls = [`${SITE}/`];
  for (const fiche of fiches()) {
    const slug = slugify(fiche.forme_fautive);
    urls.push(`${SITE}/${slug}/`, `${SITE}/${slug}/bordel/`);
  }
  return urls;
}

test('the build emits a sitemap', () => {
  const xml = readPage('/sitemap.xml');
  assert.match(xml, /^<\?xml\b/, 'it is an XML document');
  assert.match(xml, /<urlset\b[^>]*sitemaps\.org\/schemas\/sitemap\/0\.9/, 'it is a sitemap');
});

test('the sitemap lists exactly the mur and both registres of every authored fiche', () => {
  assert.deepEqual(locs(readPage('/sitemap.xml')).sort(), expectedUrls().sort());
});

test('the sitemap never lists a generated fiche, the random route, or build assets', () => {
  const urls = locs(readPage('/sitemap.xml'));
  for (const forbidden of ['/fiche-inconnue', '/-/random', '/_astro/', '/fonts/']) {
    assert.ok(
      !urls.some((url) => url.startsWith(`${SITE}${forbidden}`) || url.includes(forbidden)),
      `the sitemap must not list ${forbidden}`,
    );
  }
});

test('every sitemap URL is a document the build actually produced', () => {
  for (const url of locs(readPage('/sitemap.xml'))) {
    const path = pathOf(url);
    assert.ok(
      path === '/sitemap.xml' || pageExists(path),
      `${url} has no document in dist/ (a slug or registre mismatch)`,
    );
  }
});

test('every sitemap URL points at a page that allows indexing', () => {
  for (const url of locs(readPage('/sitemap.xml'))) {
    const html = readPage(pathOf(url));
    assert.ok(
      !/noindex/i.test(meta(html, 'robots') ?? ''),
      `${url} is listed as indexable but carries a noindex mark`,
    );
  }
});

test('the sitemap invents no lastmod for a fiche that carries no date', () => {
  assert.ok(
    fiches().every((fiche) => !('date' in fiche)),
    'the content collection exposes no date; add lastmod only when it does',
  );
  assert.ok(!/<lastmod>/i.test(readPage('/sitemap.xml')));
});

/** Every `Disallow` path of robots.txt, in document order. */
function disallows(robots: string): string[] {
  return [...robots.matchAll(/^Disallow:\s*(\S*)\s*$/gim)].map((match) => match[1] ?? '');
}

test('robots.txt points search engines at the sitemap', () => {
  const robots = readPage('/robots.txt');
  assert.match(robots, /^User-agent:\s*\*$/im, 'it speaks to every crawler');
  assert.match(
    robots,
    /^Sitemap:\s*https:\/\/onditpas\.fr\/sitemap\.xml$/im,
    'the sitemap is announced, so a crawler finds it without being told',
  );
});

test('robots.txt does not contradict the per-page noindex with a blanket disallow', () => {
  const robots = readPage('/robots.txt');
  assert.ok(
    !disallows(robots).includes('/'),
    'a blanket `Disallow: /` would stop the crawl and hide the noindex it relies on',
  );
});

test('robots.txt keeps crawlers out of the reserved utility prefix only', () => {
  assert.deepEqual(disallows(readPage('/robots.txt')), ['/-/']);
});

test('robots.txt never disallows a page the sitemap offers', () => {
  const robots = readPage('/robots.txt');
  for (const url of locs(readPage('/sitemap.xml'))) {
    const path = pathOf(url);
    assert.ok(
      !disallows(robots).some((rule) => rule !== '' && path.startsWith(rule)),
      `${path} is listed in the sitemap but disallowed by \`Disallow: ${path}\``,
    );
  }
});
