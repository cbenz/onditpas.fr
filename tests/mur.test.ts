/**
 * Seam S1 — the mur de mots at the root.
 *
 * Asserts what a visitor sees on `/`: one entry per authored fiche, the forme
 * fautive as written, a link to its fiche, and the expected French order.
 * Expectations are derived from `fiches()`, never hardcoded, so that adding
 * ten fiches (ticket #11) keeps this suite honest.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from '../src/lib/slug.ts';
import { fiches, htmlText, hrefs, readPage, title } from './helpers.ts';

const html = readPage('/');

interface WallEntry {
  /** The word as the wall displays it. */
  word: string;
  /** The target of the entry's link, without a trailing slash. */
  href: string;
}

/** Every entry of the wall, in document (i.e. visual column-flow) order. */
function wall(): WallEntry[] {
  const list = /<ul\b[^>]*class="[^"]*\bmur-list\b[^"]*"[^>]*>([\s\S]*?)<\/ul>/i.exec(html);
  assert.ok(list, 'the mur carries a list');
  const items = [...(list[1] ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
  return items.map((item) => {
    const body = item[1] ?? '';
    const href = (hrefs(body)[0] ?? '').replace(/\/$/, '');
    return { word: htmlText(body), href };
  });
}

/** The expected order: the spec's French collation, applied to the authored fiches. */
function expectedWords(): string[] {
  return fiches()
    .map((fiche) => fiche.forme_fautive)
    .sort(new Intl.Collator('fr').compare);
}

test('the mur lists every authored fiche exactly once', () => {
  const words = wall().map((entry) => entry.word);
  assert.deepEqual(
    [...words].sort(),
    expectedWords().sort(),
    'the wall shows every forme fautive and nothing else',
  );
  assert.equal(new Set(words).size, words.length, 'no fiche appears twice');
});

test('the wall is in French alphabetical order', () => {
  assert.deepEqual(wall().map((entry) => entry.word), expectedWords());
});

test('each word shows the display form, accents and all, and not the slug', () => {
  for (const fiche of fiches()) {
    const entry = wall().find((candidate) => candidate.word === fiche.forme_fautive);
    assert.ok(entry, `the wall shows ${JSON.stringify(fiche.forme_fautive)} as written`);
  }
});

test('each entry links to the page of its fiche', () => {
  const expected = new Map(
    fiches().map((fiche) => [fiche.forme_fautive, `/${slugify(fiche.forme_fautive)}`]),
  );
  for (const entry of wall()) {
    assert.equal(entry.href, expected.get(entry.word), `${entry.word} links to its fiche`);
  }
});

test('the wall announces how many fiches it holds', () => {
  const count = fiches().length;
  const label = count > 1 ? `${count} fiches` : `${count} fiche`;
  assert.ok(htmlText(html).includes(label), `the count reads « ${label} »`);
});

test('the wall flows in two columns, filled column by column', () => {
  const css = stylesheets().join('\n');
  assert.match(css, /grid-auto-flow:\s*column/, 'the grid fills column by column');
  assert.match(css, /grid-template-columns:\s*(1fr 1fr|repeat\(2,)/, 'two columns');

  // The row count adapts to the number of fiches instead of being fixed.
  const rows = /--mur-rows:\s*(\d+)/.exec(html);
  assert.ok(rows, 'the page declares how many rows the wall needs');
  assert.equal(Number(rows[1]), Math.ceil(fiches().length / 2));
  assert.match(css, /grid-template-rows:\s*repeat\(var\(--mur-rows\)/, 'the rows use that count');
});

test('the wall collapses to one column under 700px', () => {
  const blocks = mediaBlocks(stylesheets().join('\n'), 700);
  assert.ok(
    blocks.some(
      (rules) =>
        /grid-template-columns:\s*1fr\b/.test(rules) &&
        /grid-auto-flow:\s*row/.test(rules) &&
        /grid-template-rows:\s*none/.test(rules),
    ),
    'one column, rows flowing, under 700px',
  );
});

test('the wall is set in the display face, large', () => {
  const css = stylesheets().join('\n');
  assert.match(css, /\.mur-list[^{]*\.w[^{]*\{[^}]*font-size:\s*clamp\(/);
});

test('the mur carries the header with the wordmark as plain text', () => {
  const text = htmlText(html);
  assert.match(text, /onditpas\.fr/);
  assert.ok(!hrefs(html).includes('/'), 'the wordmark is not a link to the page itself');
});

test('the mur is a French page with a title', () => {
  assert.match(html, /<html\b[^>]*\blang="fr"/i);
  assert.match(title(html), /onditpas\.fr/);
});

/** The declarations of every `@media (max-width: Npx)` block, braces matched. */
function mediaBlocks(css: string, maxWidth: number): string[] {
  const pattern = new RegExp(`@media\\s*\\(max-width:\\s*${maxWidth}px\\)\\s*\\{`, 'gi');
  const blocks: string[] = [];
  for (const start of css.matchAll(pattern)) {
    let depth = 1;
    let index = (start.index ?? 0) + start[0].length;
    const from = index;
    while (index < css.length && depth > 0) {
      if (css[index] === '{') depth += 1;
      else if (css[index] === '}') depth -= 1;
      index += 1;
    }
    blocks.push(css.slice(from, index - 1));
  }
  assert.ok(blocks.length > 0, `the mur has a narrow rule at ${maxWidth}px`);
  return blocks;
}

/** The stylesheets the page carries, inline or linked, as strings. */
function stylesheets(): string[] {
  const inline = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1] ?? '');
  const linked = [...html.matchAll(/<link\b[^>]*?href="([^"]+\.css)"/gi)].map((m) =>
    readPage(m[1] ?? ''),
  );
  return [...inline, ...linked];
}
