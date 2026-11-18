/**
 * The shouting registre (`/{slug}/bordel`).
 *
 * The deadpan body of a fiche is written once; the shout is generated from it,
 * so that a fiche costs one text and not two. An authored `bordel` field stays
 * the floor of the automatic version, not its ceiling: when it is present it
 * wins, verbatim.
 *
 * Pure: no Astro, no I/O. Tests call it directly (seam S2).
 */

/** French typography puts a non-breaking space before an exclamation mark. */
const NBSP = '\u00a0';

export interface BordelTitleInput {
  /** The form people wrongly write, as authored. */
  formeFautive: string;
  /** What should be said instead; absent when the fiche has no substitute. */
  formeCorrecte?: string;
  /** Hand-written shout overriding both templates. */
  bordel?: string;
}

/** Shout one form, keeping its accents, apostrophes and hyphens. */
function shout(forme: string): string {
  return forme.trim().toUpperCase();
}

/**
 * The title of the shouting page.
 *
 * `ON DIT {forme correcte}, PAS {forme fautive}, BORDEL !` when the fiche has a
 * forme correcte, `ON DIT PAS {forme fautive}, BORDEL !` when it has none, and
 * the authored `bordel` when there is one — a blank one falls back to the
 * template rather than leaving the page silent.
 */
export function bordelTitle({ formeFautive, formeCorrecte, bordel }: BordelTitleInput): string {
  const authored = bordel?.trim();
  if (authored) return authored;

  const fautive = shout(formeFautive);
  const correcte = formeCorrecte?.trim();
  return correcte
    ? `ON DIT ${shout(correcte)}, PAS ${fautive}, BORDEL${NBSP}!`
    : `ON DIT PAS ${fautive}, BORDEL${NBSP}!`;
}
