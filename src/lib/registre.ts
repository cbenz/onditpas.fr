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
import { NBSP } from './typography.ts';

/** The tone a fiche is written in: the page as written, or the page shouting. */
export type Registre = 'deadpan' | 'bordel';

/** The label above the correction line, in the registre the page is in. */
export function registreLabel(registre: Registre): string {
  return registre === 'bordel' ? 'Bordel' : 'On dit';
}

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
