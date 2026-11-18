/**
 * Seam S2 — the GitHub coordinates, as one module.
 *
 * The fiche page's edit link, the generated fiche's writing link and the
 * proposal modal all send the visitor to the same repository. Keeping the
 * coordinates in one place is what lets a test hold them together; the shapes
 * asserted here are the ones GitHub's forms read.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BRANCH,
  FICHES_PATH,
  NEW_FILE_BASE,
  REPOSITORY,
  editUrl,
  newFileUrl,
} from '../src/lib/github.ts';

test('the repository, its branch and its content directory are one coordinate set', () => {
  assert.equal(REPOSITORY, 'https://github.com/cbenz/onditpas.fr');
  assert.equal(BRANCH, 'main');
  assert.equal(FICHES_PATH, 'src/content/fiches');
  assert.equal(NEW_FILE_BASE, `${REPOSITORY}/new/${BRANCH}/${FICHES_PATH}`);
});

test('the edit URL points at the file of a fiche, from its collection path', () => {
  assert.equal(
    editUrl('src/content/fiches/au-jour-daujourdhui.md'),
    `${REPOSITORY}/edit/${BRANCH}/${FICHES_PATH}/au-jour-daujourdhui.md`,
  );
  // A path written with a leading `./` is the same file.
  assert.equal(
    editUrl('./src/content/fiches/publique.md'),
    `${REPOSITORY}/edit/${BRANCH}/${FICHES_PATH}/publique.md`,
  );
});

test('the new-file URL names one file and asks for the pull request flow', () => {
  assert.equal(newFileUrl('aujourdhui.md'), `${NEW_FILE_BASE}?filename=aujourdhui.md&quick_pull=1`);
  assert.ok(newFileUrl('été.md').includes('filename=%C3%A9t%C3%A9.md'), 'the name is escaped');
});
