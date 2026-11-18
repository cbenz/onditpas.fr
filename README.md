# onditpas.fr

A static site of one-page rants against a misused word or expression. Every URL
is a fiche: `onditpas.fr/publique` shows the wrong form enormous, then the
correct one, a short definition and a source. The home page is the mur de mots,
every authored fiche as one large word.

Stack: Astro 5, static output, no client framework, no server, no database.
Domain vocabulary lives in [GLOSSARY.md](GLOSSARY.md).

## Development

```sh
npm install
npm run dev                  # local server
npm test                     # astro build, then the tests over dist/
npm run build                # static build into dist/
```

Node 22, as pinned in `.nvmrc`. Tests use Node's built-in runner: they read the
build output in `dist/`, never an `.astro` file.

## Content

One Markdown file per fiche in `src/content/fiches/`. The frontmatter is
validated at build time by `src/content.config.ts`, so a malformed fiche fails
the build instead of shipping.

## Deploy

Vercel builds `main` on every push and every pull request. The host
configuration is committed in `vercel.json`; the domain, the nameservers and the
console steps only the site owner can perform are in
[docs/deploy.md](docs/deploy.md).
