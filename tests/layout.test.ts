/**
 * Seam S1 — the narrow layout, held at the stylesheet level.
 *
 * The spec's criterion is "no horizontal scroll at 390px", which only a browser
 * can prove. No browser is available here, so this file asserts what the
 * stylesheet says instead: the row stacks under 700px, the headline may break a
 * long word, and no fixed box is wider than the narrowest viewport the spec
 * names. The test names say so; it is a CSS-level check, not a rendering one.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { slugify } from '../src/lib/slug.ts';
import { fiches, readPage } from './helpers.ts';

/** The fiche with the longest forme fautive: the one the spec's rule is for. */
const LONGEST = [...fiches()].sort((a, b) => b.forme_fautive.length - a.forme_fautive.length)[0];
if (LONGEST === undefined) throw new Error('the build has no authored fiche');

/** Any fiche page: the stylesheets are shared by all of them. */
const html = readPage(`/${slugify(LONGEST.forme_fautive)}/`);

/** Every stylesheet the page carries, inline or linked, as one string. */
function stylesheets(document: string): string {
  const inline = [...document.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (match) => match[1] ?? '',
  );
  const linked = [...document.matchAll(/<link\b[^>]*?href="([^"]+\.css)"/gi)].map((match) =>
    readPage(match[1] ?? ''),
  );
  return [...inline, ...linked].join('\n');
}

const css = stylesheets(html);

/** The declarations of every `@media (max-width: Npx)` block, braces matched. */
function mediaBlocks(sheet: string, maxWidth: number): string[] {
  const pattern = new RegExp(`@media\\s*\\(max-width:\\s*${maxWidth}px\\)\\s*\\{`, 'gi');
  const blocks: string[] = [];
  for (const start of sheet.matchAll(pattern)) {
    let depth = 1;
    let index = (start.index ?? 0) + start[0].length;
    const from = index;
    while (index < sheet.length && depth > 0) {
      if (sheet[index] === '{') depth += 1;
      else if (sheet[index] === '}') depth -= 1;
      index += 1;
    }
    blocks.push(sheet.slice(from, index - 1));
  }
  return blocks;
}

test('the fiche row stacks to one column under 700px (stylesheet only)', () => {
  const blocks = mediaBlocks(css, 700);
  assert.ok(blocks.length > 0, 'the stylesheet has a narrow rule at 700px');
  assert.ok(
    blocks.some((rules) => /\.row[^{]*\{[^}]*grid-template-columns:\s*1fr\b/.test(rules)),
    'the two-column row becomes one column',
  );
});

test('the headline breaks a long word instead of widening the page (stylesheet only)', () => {
  // `au jour d’aujourd’hui` is the case the spec names: one word wider than a
  // phone, with no space to break at.
  assert.ok(
    fiches().some((fiche) => fiche.forme_fautive.includes('aujourd’hui')),
    'the build carries the long forme fautive this rule exists for',
  );
  assert.match(css, /\.headline[^{]*\{[^}]*overflow-wrap:\s*anywhere/, 'the headline may break');
  assert.match(
    css,
    /\.headline[^{]*\{[^}]*font-size:\s*clamp\(/,
    'the headline scales down before it needs to break',
  );
});

test('no fixed box is wider than the 390px viewport the spec names (stylesheet only)', () => {
  const limits: Array<{ declaration: string; width: number }> = [];
  const declaration = /(?:^|[;{])\s*((?:min-|max-)?width)\s*:\s*([^;}]+)/g;

  for (const match of css.matchAll(declaration)) {
    const value = (match[2] ?? '').trim();
    // A viewport-relative or capped value cannot overflow: it follows the screen.
    if (/clamp\(|min\(|max\(|%|vw|auto|none|fit-content/.test(value)) continue;
    // Font-relative measures scale with the text, so they are not fixed boxes.
    if (/^(?:\d+(?:\.\d+)?)(?:ch|ex)$/.test(value)) continue;
    // Zero is a reset, not a width.
    if (value === '0') continue;

    const size = /^(\d+(?:\.\d+)?)(px|rem|em)$/.exec(value);
    assert.ok(size, `width: ${value} is not a fixed length this test can read`);
    const [, amount = '0', unit = 'px'] = size;
    const ratio = unit === 'px' ? 1 : 16;
    limits.push({ declaration: match[0].trim(), width: Number(amount) * ratio });
  }

  assert.ok(limits.length > 0, 'the stylesheet declares at least one fixed width');
  for (const { declaration, width } of limits) {
    assert.ok(width <= 390, `${declaration} is ${width}px wide, wider than the 390px viewport`);
  }
});
