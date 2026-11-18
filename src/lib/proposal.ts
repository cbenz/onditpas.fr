/**
 * A contribution, as a value.
 *
 * The proposal modal builds a Markdown file and the GitHub new-file URL that
 * carries it; both are computed here, with no Astro in sight, so that the same
 * rules the content schema enforces at build time can be applied before the
 * visitor leaves the site.
 *
 * The rules mirror `src/content.config.ts` exactly: `justification` is required
 * when there is no forme correcte, and a forme correcte needs at least one
 * source. On top of the schema, the deadpan text is required — a fiche with no
 * text is not a fiche.
 */
import { slugify } from './slug.ts';

/** The repository the proposal opens a pull request against. */
export const REPO = 'cbenz/onditpas.fr';
/** Where the fiches live inside it. */
export const FICHES_PATH = 'src/content/fiches';
/** The branch proposals target. */
export const BRANCH = 'main';

/**
 * GitHub's new-file form for this directory; also the no-JavaScript fallback.
 * Written out in full rather than composed, so that the built page carries the
 * destination as one readable string.
 */
export const NEW_FILE_BASE = 'https://github.com/cbenz/onditpas.fr/new/main/src/content/fiches';

export interface ProposalInput {
  /** The form people wrongly write; the slug and the file name derive from it. */
  formeFautive: string;
  /** What should be said instead; absent when there is nothing to substitute. */
  formeCorrecte?: string;
  /** Why there is nothing to say instead; required exactly when the above is absent. */
  justification?: string;
  /** URLs backing the correction; at least one when `formeCorrecte` is given. */
  sources?: string[];
  /** The deadpan definition text, as Markdown. */
  body: string;
}

export interface Proposal {
  /** GitHub path segment: the slug of the forme fautive. */
  slug: string;
  /** File name inside the fiches directory. */
  filename: string;
  /** The whole Markdown file, frontmatter included. */
  markdown: string;
  /** GitHub's new-file form, pre-filled. */
  url: string;
}

/** The field of a proposal a rejection points at, to focus it in the form. */
export type ProposalField = 'formeFautive' | 'body' | 'sources' | 'justification';

/** Raised when a proposal would produce a file the content schema rejects. */
export class InvalidProposal extends Error {
  readonly field: ProposalField;

  constructor(field: ProposalField, message: string) {
    super(message);
    this.name = 'InvalidProposal';
    this.field = field;
  }
}

/** Trim a value that is optional in the form and empty when left alone. */
function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** A YAML scalar, double-quoted so that a colon or an apostrophe cannot break it. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/**
 * Apply the content schema to a proposal.
 *
 * Throws `InvalidProposal` with a message naming the field at fault, which is
 * what the modal shows under the form.
 */
export function assertValid(input: ProposalInput): void {
  const formeFautive = optional(input.formeFautive);
  const formeCorrecte = optional(input.formeCorrecte);
  const justification = optional(input.justification);
  const sources = (input.sources ?? []).map((source) => source.trim()).filter(Boolean);
  const body = optional(input.body);

  if (!formeFautive) throw new InvalidProposal('formeFautive', 'La forme fautive est obligatoire.');
  if (!body) throw new InvalidProposal('body', 'Le texte de la fiche est obligatoire.');

  if (formeCorrecte) {
    if (sources.length === 0) {
      throw new InvalidProposal(
        'sources',
        'Une source est obligatoire quand il y a une forme correcte.',
      );
    }
    for (const source of sources) {
      if (!URL.canParse(source)) {
        throw new InvalidProposal('sources', `Cette source n’est pas une URL : ${source}`);
      }
    }
    return;
  }

  if (!justification) {
    throw new InvalidProposal('justification', 'Dites pourquoi il n’y a rien à dire à la place.');
  }
}

/** The Markdown file a proposal becomes. */
export function buildFiche(input: ProposalInput): string {
  assertValid(input);

  const formeCorrecte = optional(input.formeCorrecte);
  const justification = optional(input.justification);
  const sources = (input.sources ?? []).map((source) => source.trim()).filter(Boolean);

  const frontmatter = [`forme_fautive: ${quote(optional(input.formeFautive) ?? '')}`];
  if (formeCorrecte) frontmatter.push(`forme_correcte: ${quote(formeCorrecte)}`);
  if (justification) frontmatter.push(`justification: ${quote(justification)}`);
  if (sources.length > 0) {
    frontmatter.push('sources:', ...sources.map((source) => `  - ${quote(source)}`));
  }

  return `---\n${frontmatter.join('\n')}\n---\n\n${optional(input.body) ?? ''}\n`;
}

/** GitHub's edit form for the file of one fiche. */
export function editUrl(slug: string): string {
  return `https://github.com/${REPO}/edit/${BRANCH}/${FICHES_PATH}/${slug}.md`;
}

/** The whole proposal: the file to create and the form that creates it. */
export function buildProposal(input: ProposalInput): Proposal {
  const markdown = buildFiche(input);
  const formeFautive = optional(input.formeFautive) ?? '';
  const slug = slugify(formeFautive);
  const filename = `${slug}.md`;

  // GitHub's new-file form. Every parameter is encoded on its own; the whole
  // Markdown file travels in `value`, so a bare `&` in the text cannot cut it.
  const params = [
    ['filename', filename],
    ['value', markdown],
    ['message', `feat(content): add the fiche for ${formeFautive}`],
    ['description', 'Proposition envoyée depuis onditpas.fr.'],
    ['quick_pull', '1'],
  ] as const;
  const query = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return { slug, filename, markdown, url: `${NEW_FILE_BASE}?${query}` };
}
