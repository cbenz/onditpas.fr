/**
 * Where the fiches are contributed.
 *
 * One module owns the repository, its branch, the content directory and the two
 * GitHub forms the site links to, so that the fiche page's edit link, the
 * generated fiche's writing link and the proposal modal cannot drift apart.
 *
 * Pure: no Astro, no DOM, no I/O.
 */

/** The public repository the fiches are contributed to. */
export const REPOSITORY = 'https://github.com/cbenz/onditpas.fr';

/** Where the fiches live inside it. */
export const FICHES_PATH = 'src/content/fiches';

/** The branch edits read from and proposals target. */
export const BRANCH = 'main';

/** GitHub's new-file form for the fiches directory; the control's fallback. */
export const NEW_FILE_BASE = `${REPOSITORY}/new/${BRANCH}/${FICHES_PATH}`;

/**
 * GitHub's new-file form, pre-filled with one file name.
 *
 * `quick_pull=1` opens the comparison rather than the editor, so a visitor
 * without write access gets a fork and a pull request in one gesture.
 */
export function newFileUrl(filename: string): string {
  return `${NEW_FILE_BASE}?filename=${encodeURIComponent(filename)}&quick_pull=1`;
}

/**
 * GitHub's edit form for the file of one fiche.
 *
 * Takes the path the content collection reports for the entry — the real file,
 * not a name guessed from the slug, because the two do not always agree
 * (`au-jour-daujourdhui.md` is the file of the fiche at `/aujourdaujourdhui`).
 */
export function editUrl(filePath: string): string {
  const path = filePath.replace(/^\.?\/+/, '');
  return `${REPOSITORY}/edit/${BRANCH}/${path}`;
}
