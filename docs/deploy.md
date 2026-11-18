# Deploy

The site is a static Astro build. There is no server process, no database and no
serverless function: the host runs the build and serves the directory it
produces.

## The Vercel project

- Repository `cbenz/onditpas.fr`, root directory = repository root, framework
  preset **Astro**.
- `vercel.json` is committed and carries the build settings: `buildCommand`
  `npm run build`, `outputDirectory` `dist`, `cleanUrls` true. Change the
  deployment settings in that file, not in the dashboard; `tests/deploy.test.ts`
  fails when the file drifts from what the build produces.
- Node: `.nvmrc` says `22` for local tooling, and `engines.node` in
  `package.json` (`>=22`) is what Vercel reads. If a build ever picks a Node
  version that breaks the build, pin `engines.node` to `22.x` rather than using
  the dashboard setting, which `engines` overrides.
- No environment variable and no secret to configure. The only out-of-band
  setting is the domain, below.
- `cleanUrls` is on, so `publique/index.html` is served at `/publique`. Astro
  emits its canonical URL with a trailing slash (`https://onditpas.fr/publique/`),
  and `trailingSlash` is left unset in `vercel.json` on purpose: the host then
  answers both `/publique` and `/publique/` without a redirect between them, so a
  shared link does not spend a hop before reaching the fiche.
- `vercel.json` also carries the catch-all rewrite (see below): an unknown path
  answers with the generated-fiche document, not a 404. Nothing else in the
  host configuration stands between a mistyped URL and that document.

## What deploys what

| Trigger | Result |
| --- | --- |
| Push to `main` | Production deployment, served at `https://onditpas.fr` |
| Pull request | Preview deployment on a `*.vercel.app` URL, rebuilt on every commit |

The preview URL is what a ticket is verified against: open the pull request and
use the deployment link Vercel comments on it. A preview build runs the same
`npm run build`, so a fiche broken in a pull request is broken there too.

## Domain, DNS and the certificate

`onditpas.fr` is registered at Scaleway and its zone stays at Scaleway: the
domain keeps Scaleway's nameservers (`ns0.dom.scw.cloud`, `ns1.dom.scw.cloud`).
Vercel is only the web host, reached through two records kept in that zone.
Delegating the nameservers would make Vercel the DNS authority instead;
`docs/adr/0001-dns-authority-stays-at-scaleway.md` records why this site does
not do that.

1. **Vercel console** → project → *Settings* → *Domains* → add `onditpas.fr`,
   set it as the production domain, and add `www.onditpas.fr` as well; Vercel
   then redirects `www` to the apex in a single hop (a 307 in practice).
2. On that same screen, Vercel shows the records it wants: an `A` record for the
   apex and a `CNAME` for `www`. Both values are specific to the project, so
   read them off the screen. They deliberately appear in no document and in no
   test here, because another project would have different ones.
3. Create those two records in the Scaleway zone, in the console or with the
   CLI:

   ```sh
   scw dns record add onditpas.fr name=@ type=A data=<ip from the screen> ttl=300
   scw dns record add onditpas.fr name=www type=CNAME data=<target from the screen> ttl=300
   ```

4. Vercel flips the domain to *Valid Configuration* and issues the certificate
   on its own. *Force HTTPS* is on by default and must stay on.

Then check the result from a terminal:

```sh
curl -sI https://onditpas.fr/publique   # 200, and no Location header
curl -sI http://onditpas.fr/publique    # a single 308 towards https
```

A `Location` header on the first command, or more than one hop, means a redirect
chain: fix it in the Vercel domain settings before calling the launch done.

### When the domain reports Invalid Configuration

Compare what the zone publishes with what the host asks for:

```sh
dig +short A onditpas.fr @8.8.8.8
dig +short CNAME www.onditpas.fr @8.8.8.8
scw dns record list onditpas.fr
npx vercel domains inspect onditpas.fr
```

An empty answer means the record is missing or still propagating; a value that
differs from the screen means a stale or conflicting record exists and has to
go. When the records are in the zone and resolvers still return nothing, check
the delegation before the records: `dig +trace onditpas.fr` shows what the `.fr`
parent publishes, and a nameserver switch takes effect in the registry database
hours before the parent zone file is regenerated. The parent's `NS` records carry
a 3600 second TTL, so an hour of confused resolution after a switch is normal.

The zone must also stay free of leftovers from a nameserver attempt: an `A` or
`AAAA` alongside a `CNAME` on the same name is an invalid configuration on its
own.

### The nameserver alternative

Handing the whole zone to Vercel works too, and it is the path the spec named.
It makes Vercel the DNS authority, so every other record (mail, verification
`TXT`, future subdomains) has to move there as well, and the switch takes hours
instead of minutes.

One trap, met once on this domain: the pair Vercel expects is per zone and per
team, and a dashboard may show a sharded name (`ns1.vercel-dns-017.com`) where
the generic `ns1.vercel-dns.com` / `ns2.vercel-dns.com` does not work. Read the
pair off the screen and confirm it with `npx vercel domains verify onditpas.fr
--project onditpas.fr`. With the wrong pair at the registry,
`dig +short SOA onditpas.fr @<nameserver>` answers `REFUSED`, the domain resolves
nowhere, and the console keeps reporting *Invalid Configuration*.

AFNIC publishes no `DS` for this domain, so delegating or reverting the
nameservers cannot break resolution through a stale DNSSEC record.

## What only the site owner can do

- Create the Vercel project and import the GitHub repository (first link
  between the two accounts).
- Read the `A` and `CNAME` values from the Vercel console and create the two
  records in the Scaleway zone.
- Confirm the certificate issued and *Force HTTPS* is on.

Everything else — the build, the output directory, the URL behaviour, the tests
that hold the configuration in place — is committed.

## The catch-all rewrite

Any path that is not an authored fiche answers with the same static document.
`vercel.json` carries one rule:

```json
"rewrites": [
  { "source": "/((?!_astro/|-/)(?!.*\\.[a-zA-Z0-9]+$).+)", "destination": "/fiche-inconnue" }
]
```

- A rewrite is not a redirect: there is no `permanent` flag, the visitor keeps
  the URL they typed and the answer is a 200. That is the point — a shared
  `/pouet` link has to preview and open like a page.
- `/-/` is the reserved prefix for utility routes (`/-/random`), and
  `/_astro/` holds the built assets. Neither is captured.
- Anything whose last segment looks like a file (`/sitemap.xml`,
  `/robots.txt`, `/favicon.ico`, `/fonts/anton-latin.woff2`) is left alone, so
  the crawler and the browser still get the file they asked for.
- Vercel checks the filesystem before applying rewrites, so the mur, the
  authored fiches, the redirect pages and the assets are served from `dist/`
  without reaching this rule at all; the exclusions above are the ones that
  would otherwise fall through to it.
- The rewritten document, `dist/fiche-inconnue/index.html`, fills in the word
  from `location.pathname` in the browser. It is `noindex, nofollow` and emits
  no canonical tag: one document serves infinite URLs and must not compete with
  the fiches in search results. `tests/generated.test.ts` holds both the rule
  and the document in place.
