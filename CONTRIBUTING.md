# Contributing

A fiche is one Markdown file in `src/content/fiches/`. You do not have to know
the format: the form on the site writes the file for you.

## Proposing a fiche from the site

The `proposer` control sits at the bottom right of every page. It asks for the
forme fautive, the forme correcte (optional), a source, and the text of the
fiche, and shows the fiche as it will be published. Leaving the forme correcte
empty turns the source field into a justification field: say why there is
nothing to say instead, and that sentence is what the fiche displays.

Submitting opens GitHub's new-file form, already filled with:

- the file name, derived from the forme fautive;
- the whole Markdown file;
- a commit message and a pull request description.

Press **Propose new file**, then **Create pull request**. If you have no write
access to this repository, GitHub offers to fork it and opens the pull request
from your fork; you do not need to understand forks to do this. Nothing is
published until the pull request is merged.

To fix an existing fiche, use the `modifier` link at the bottom of that fiche
and send a pull request the same way.

## Writing the file by hand

The file is `src/content/fiches/{slug}.md`. The slug is derived from the forme
fautive: lowercased, accents stripped, spaces and apostrophes removed, hyphens
kept. `aujourd'hui` gives `aujourdhui`, `wi-fi` keeps its hyphen, `publique`
stays `publique`. Do not pick the file name yourself, or the fiche will be
reachable at an address nobody types.

```markdown
---
forme_fautive: publique
forme_correcte: public
sources:
  - https://www.larousse.fr/dictionnaires/francais/public/65173
---

Le public, c’est l’ensemble des gens, ou ce qui les concerne tous.
```

The frontmatter is validated at build time by `src/content.config.ts`:

| Field | Required | Contents |
| --- | --- | --- |
| `forme_fautive` | yes | The form people wrongly write, as it is read: accents, spaces and apostrophes kept. |
| `forme_correcte` | no | What should be said instead. Omit it when the fiche has nothing to substitute. |
| `justification` | when `forme_correcte` is absent | Why there is nothing to say instead. Required when there is no forme correcte. |
| `sources` | when `forme_correcte` is present | At least one URL backing the correction. Omit the field entirely when there is none. |
| `bordel` | no | Overrides the shouting text that `/{slug}/bordel` generates. |

The Markdown body is the deadpan definition. Keep it short: it is a margin note,
not an essay.

## Before opening the pull request

```sh
npm install
npm test        # astro build, then the tests over dist/
```

A malformed fiche fails the build, with the name of the field at fault. Node 22
or later, as pinned in `.nvmrc`.

One fiche per pull request. Two fiches in one branch means two fiches blocked by
one review comment.

## Rights you grant

By proposing a fiche you grant the site owner the right to publish it and to
exploit it commercially, in any form, including printed matter. This is what
lets the site stay free and one day sell a poster of it.

The source code is under the MIT licence. The fiches, the texts and the visual
identity are not: they are all rights reserved. See [LICENSE](LICENSE).
