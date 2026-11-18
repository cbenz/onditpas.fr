/**
 * Seam S1 — the shouting registre, as the build produces it.
 *
 * The shouting page is the deadpan fiche with a generated title and the accent
 * colour; everything else about it must stay identical. These tests read
 * `dist/` and the authored fiches, and never an `.astro` file.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

import { bordelTitle } from '../src/lib/registre.ts';
import { slugify } from '../src/lib/slug.ts';
import {
  DIST,
  type AuthoredFiche,
  fiches,
  hrefs,
  htmlText,
  pageExists,
  readPage,
  title,
} from './helpers.ts';

/** A non-breaking space, as French typography requires before `!`. */
const NBSP = '\u00a0';

/** Collapse whitespace, so that a non-breaking space compares equal to a space. */
const norm = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * The document without its stylesheets and scripts.
 *
 * One stylesheet serves the whole site, so `.is-bordel` is in every page's CSS:
 * what distinguishes a shouting page is that its markup carries the class.
 */
const markup = (html: string): string =>
  html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

/** Dist path of the shouting page of a fiche. */
const shoutPath = (fiche: AuthoredFiche): string => `/${slugify(fiche.forme_fautive)}/bordel/`;
/** Dist path of its deadpan page. */
const deadpanPath = (fiche: AuthoredFiche): string => `/${slugify(fiche.forme_fautive)}/`;

/** The definition block, as the page renders it. */
function definition(html: string): string {
  const match = /<div class="def">([\s\S]*?)<\/div>/i.exec(html);
  assert.ok(match, 'the page carries a definition block');
  return norm(htmlText(match[1] ?? ''));
}

/** The correction line, as the page renders it. */
function correction(html: string): string {
  const match = /<b class="display">([\s\S]*?)<\/b>/i.exec(html);
  assert.ok(match, 'the page carries a correction line');
  return norm(htmlText(match[1] ?? ''));
}

/**
 * The shouting title the spec prescribes for a fiche, restated here from the
 * frontmatter so that the test does not simply agree with the implementation.
 */
function expectedShout(fiche: AuthoredFiche): string {
  const fautive = fiche.forme_fautive.toUpperCase();
  return fiche.forme_correcte
    ? `ON DIT ${fiche.forme_correcte.toUpperCase()}, PAS ${fautive}, BORDEL${NBSP}!`
    : `ON DIT PAS ${fautive}, BORDEL${NBSP}!`;
}

const authored = fiches();
assert.ok(authored.length > 0, 'the build has at least one authored fiche to shout about');

for (const fiche of authored) {
  test(`/${slugify(fiche.forme_fautive)}/bordel: the shouting page is pre-rendered`, () => {
    assert.ok(pageExists(shoutPath(fiche)), `${shoutPath(fiche)} is in the build output`);
    assert.match(readPage(shoutPath(fiche)), /<html\b[^>]*\blang="fr"/i);
  });

  test(`/${slugify(fiche.forme_fautive)}/bordel: the title follows the template`, () => {
    const shout = norm(title(readPage(shoutPath(fiche))));
    // An authored shout wins over both templates; otherwise the template speaks.
    const expected = fiche.bordel ? norm(fiche.bordel) : norm(expectedShout(fiche));
    assert.ok(
      shout.startsWith(expected),
      `${JSON.stringify(shout)} does not start with ${JSON.stringify(expected)}`,
    );
  });

  test(`/${slugify(fiche.forme_fautive)}/bordel: the shout is on the page, not only in the head`, () => {
    const shout = fiche.bordel ? norm(fiche.bordel) : norm(expectedShout(fiche));
    assert.equal(correction(readPage(shoutPath(fiche))), shout);
  });

  test(`/${slugify(fiche.forme_fautive)}/bordel: the body is the deadpan body, unchanged`, () => {
    const deadpan = definition(readPage(deadpanPath(fiche)));
    const shouting = definition(readPage(shoutPath(fiche)));
    assert.ok(deadpan.length > 0, 'the deadpan page has something to keep');
    assert.equal(shouting, deadpan);
  });

  test(`/${slugify(fiche.forme_fautive)}/bordel: the forme fautive stays the headline`, () => {
    const html = readPage(shoutPath(fiche));
    const headline = /<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    assert.ok(headline, 'the shouting page has an h1');
    assert.equal(norm(htmlText(headline[1] ?? '')), norm(fiche.forme_fautive));
  });

  test(`${deadpanPath(fiche)}: the deadpan page is untouched by the registre`, () => {
    const html = readPage(deadpanPath(fiche));
    assert.ok(!markup(html).includes('is-bordel'), 'the deadpan page is not shouting');
    assert.ok(!/BORDEL/.test(htmlText(html)), 'the deadpan page does not shout');
    // A fiche with nothing to substitute carries no correction line at all:
    // it shows its justification instead of a forme correcte.
    if (fiche.forme_correcte === undefined) {
      assert.ok(!/<b class="display">/.test(markup(html)), 'no correction line to compare');
      assert.ok(
        norm(htmlText(html)).includes(norm(fiche.justification ?? '')),
        'the fiche says why there is nothing to substitute',
      );
      return;
    }
    const shout = fiche.bordel ? norm(fiche.bordel) : norm(expectedShout(fiche));
    assert.notEqual(correction(html), shout);
  });
}

test('every authored fiche offers its shouting version, discreetly', () => {
  // User story 8: choose how hard to send it. The link is a quiet line in the
  // footer, not a second call to action.
  for (const fiche of authored) {
    const slug = slugify(fiche.forme_fautive);
    const html = readPage(deadpanPath(fiche));
    const href = `/${slug}/bordel`;
    assert.ok(hrefs(html).includes(href), `${fiche.file} links to ${href}`);
    assert.match(html, /class="[^"]*\bplus-fort\b/, `${fiche.file} names the link`);
    assert.ok(pageExists(`${href}/`), `${href} exists in the build`);
    assert.ok(
      htmlText(html).includes('le dire plus fort'),
      `${fiche.file} says what the link does, in French`,
    );
    // The shouting page is already the shouting page: it does not link to itself.
    assert.ok(!hrefs(readPage(shoutPath(fiche))).includes(href), `${href}/bordel does not self-link`);
  }
});

/* ── the accent colour ──────────────────────────────────────────────── */

/** Every stylesheet a page carries: inlined `<style>` and linked `.css` files. */
function stylesheets(html: string): string {
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1] ?? '');
  const linked = [...html.matchAll(/<link\b[^>]*?href="([^"]+\.css)"/gi)].map((m) =>
    readPage(m[1] ?? ''),
  );
  return [...inline, ...linked].join('\n');
}

/** `#e0231a` or `var(--accent)`: both spellings of the accent. */
const ACCENT = /#e0231a|var\(\s*--accent\s*\)/i;
/** The token declaration itself, which every page carries. */
const TOKEN = /--accent\s*:/;

/** The rule blocks of a stylesheet that paint something with the accent. */
function accentRules(css: string): Array<{ selector: string; body: string }> {
  return [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
    .map(([, selector = '', body = '']) => ({ selector: selector.trim(), body }))
    .filter(({ body }) => ACCENT.test(body) && !TOKEN.test(body));
}

for (const fiche of authored) {
  const shouting = shoutPath(fiche);
  const deadpan = deadpanPath(fiche);

  test('the accent hex is declared once, never hardcoded in a rule', () => {
    for (const path of [deadpan, shouting]) {
      const css = stylesheets(readPage(path));
      const hex = [...css.matchAll(/#e0231a/gi)];
      assert.equal(hex.length, 1, `${path}: the accent hex appears only as the token`);
      assert.ok(TOKEN.test(css), `${path}: the accent token is declared`);
    }
  });

  test('the accent paints the shouting registre and nothing else', () => {
    const shoutingCss = stylesheets(readPage(shouting));

    for (const path of [deadpan, shouting]) {
      const css = stylesheets(readPage(path));
      for (const { selector } of accentRules(css)) {
        assert.ok(
          selector.includes('.is-bordel'),
          `${path}: ${selector} paints with the accent outside the shouting registre`,
        );
      }
    }

    const scoped = accentRules(shoutingCss).filter(({ selector }) =>
      selector.includes('.is-bordel'),
    );
    assert.ok(scoped.length > 0, 'the shouting registre is painted with the accent');
    assert.ok(
      scoped.some(({ body }) => /color\s*:/.test(body)),
      'the accent is applied as a text colour on the shouting page',
    );
    // The stylesheet is shared, so `.is-bordel` rules are in both pages' CSS;
    // the class on the markup is what tells the two registres apart.
    assert.ok(!markup(readPage(deadpan)).includes('is-bordel'));
  });

  test('the accent class is carried by the shouting page markup', () => {
    assert.match(markup(readPage(shouting)), /<article\b[^>]*\bis-bordel\b/);
    assert.ok(!markup(readPage(deadpan)).includes('is-bordel'));
  });
}

test('no page outside a shouting route carries the shouting registre', () => {
  const pages = (readdirSync(DIST, { recursive: true }) as string[])
    .map((file) => join(DIST, file))
    .map((file) => ({ file, path: relative(DIST, file) }))
    .filter(({ path }) => path.endsWith('.html'));

  assert.ok(pages.length > 0, 'the build produced pages');

  for (const { file, path } of pages) {
    if (!markup(readFileSync(file, 'utf8')).includes('is-bordel')) continue;
    assert.match(path, /bordel\/index\.html$/, `${path} shouts outside a /bordel route`);
  }
});

test('an authored shout is used verbatim when a fiche has one', () => {
  for (const fiche of authored.filter((candidate) => candidate.bordel)) {
    assert.equal(
      correction(readPage(shoutPath(fiche))),
      norm(fiche.bordel ?? ''),
      `${fiche.file}: the authored bordel is not the one rendered`,
    );
    assert.equal(
      norm(title(readPage(shoutPath(fiche)))).startsWith(norm(fiche.bordel ?? '')),
      true,
    );
  }
});
