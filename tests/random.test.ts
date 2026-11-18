/**
 * Random fiche at `/-/random` — seam S1, plus the built script executed.
 *
 * The page is a static document: the draw happens in the browser, on every
 * load, from the slugs the build embedded. These tests read that document in
 * `dist/`, check the host rewrite leaves it alone, and run the shipped inline
 * script against a stub `location` to watch it choose.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

import { slugify } from '../src/lib/slug.ts';
import { ROOT, fiches, hrefs, htmlText, meta, pageExists, readPage, title } from './helpers.ts';

/** Every slug the build should have embedded: derived, never hardcoded. */
const SLUGS = fiches().map((fiche) => slugify(fiche.forme_fautive));

const PAGE = '/-/random/';
const built = pageExists(PAGE);
const html = built ? readPage(PAGE) : '';
const text = htmlText(html);

test('the random route is its own document in the build output', () => {
  assert.ok(built, `${PAGE} is emitted by the build`);
  assert.ok(html.includes('<html'), 'it is an HTML document, not a fiche');
  assert.match(html, /<html\b[^>]*\blang="fr"/i);
  assert.ok(title(html).length > 0, 'it has a title');
});

test('the random route is noindex, nofollow', () => {
  const robots = meta(html, 'robots') ?? '';
  assert.match(robots, /noindex/);
  assert.match(robots, /nofollow/);
});

test('the random route claims no canonical', () => {
  assert.ok(
    !/<link\b[^>]*\brel="canonical"/i.test(html),
    'the page points at no fiche, so it advertises no address',
  );
});

test('the page embeds exactly the authored slugs', () => {
  const embedded = embeddedSlugs(html);
  assert.deepEqual([...embedded].sort(), [...SLUGS].sort());
});

test('without JavaScript the page offers a plain link to the mur', () => {
  assert.ok(hrefs(html).includes('/'), 'the mur is reachable without a script');
  assert.match(text, /JavaScript/, 'and the page says why it cannot draw for you');
  assert.match(text, /hasard/, 'the page says what it is for');
});

test('the page script draws at runtime, not at build time', () => {
  const script = inlineScript(html);
  assert.match(script, /Math\.random\(\)/, 'the choice is drawn in the browser');
  assert.match(script, /location\.replace\(/, 'the visitor is sent on with a replace, not a push');
});

test('two draws reach two different authored fiches', () => {
  const first = draw(0);
  const second = draw(0.999);

  assert.ok(SLUGS.includes(first), `${first} is an authored fiche`);
  assert.ok(SLUGS.includes(second), `${second} is an authored fiche`);
  assert.notEqual(first, second, 'the draw depends on Math.random, not on the build');
});

/* ── the host rewrite ───────────────────────────────────────────────── */

interface Rewrite {
  source: string;
  destination: string;
}

const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8')) as {
  rewrites?: Rewrite[];
};
const capture = (vercel.rewrites ?? []).find(
  (rewrite) => rewrite.destination === '/fiche-inconnue',
);

/**
 * Does the catch-all rewrite capture a path?
 *
 * The committed `source` is one custom-regex group with no named parameter, so
 * reading it as an anchored JavaScript regular expression is what the host does
 * with it. The same check as `tests/generated.test.ts`, kept local because that
 * helper is not exported.
 */
function captures(path: string): boolean {
  assert.ok(capture, 'vercel.json declares the catch-all rewrite');
  return new RegExp(`^${capture.source}$`).test(path);
}

test('the catch-all rewrite does not capture the random route', () => {
  assert.ok(!captures('/-/random'), '/-/random is its own document, not a generated fiche');
  assert.ok(!captures('/-/random/'), 'with or without a trailing slash');
});

/* ── reading the document ───────────────────────────────────────────── */

/** The inline scripts of the document, joined. */
function scripts(document: string): string {
  return [...document.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1] ?? '')
    .join('\n');
}

/** The one inline script that performs the draw. */
function inlineScript(document: string): string {
  const block = [...document.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1] ?? '')
    .find((body) => body.includes('location.replace'));
  assert.ok(block, 'the page carries an inline script that replaces the location');
  return block;
}

/**
 * The JSON array of strings the page inlines.
 *
 * The page has to carry the slugs to draw from; parsing the array out of the
 * script is the least coupled way to see what it actually ships.
 */
function embeddedSlugs(document: string): string[] {
  const arrays = [...scripts(document).matchAll(/\[(?:\s*"[^"]*"\s*,?)*\s*\]/g)]
    .map((match) => match[0])
    .map((literal) => {
      try {
        const value: unknown = JSON.parse(literal);
        return Array.isArray(value) ? value : null;
      } catch {
        return null;
      }
    })
    .filter((value): value is string[] => Array.isArray(value));

  assert.equal(arrays.length, 1, 'the page inlines exactly one list of slugs');
  return arrays[0] ?? [];
}

/**
 * Run the shipped script with a stubbed `Math.random` and `location`.
 *
 * Returns the slug the script sent the visitor to, without the leading slash.
 * Feeding a fixed random value makes the draw observable without asking which
 * fiche "should" win.
 */
function draw(random: number): string {
  let target: string | undefined;
  const fakeLocation = {
    replace(url: string) {
      target = url;
    },
  };
  // The real Math, with only the draw pinned; `floor` and friends stay usable.
  const fakeMath: Math = Object.create(Math);
  fakeMath.random = () => random;

  const execute = new Function('location', 'Math', inlineScript(html));
  execute(fakeLocation, fakeMath);

  assert.ok(target !== undefined, 'the script replaced the location');
  const match = /^\/([^/?#]+)$/.exec(target);
  assert.ok(match, `the redirect target is /{slug}, got ${JSON.stringify(target)}`);
  return match[1] ?? '';
}
