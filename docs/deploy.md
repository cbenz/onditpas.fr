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
- Ticket #7 adds the catch-all rewrite to the same file, as a `rewrites` entry.
  Nothing in the current file stands in its way.

## What deploys what

| Trigger | Result |
| --- | --- |
| Push to `main` | Production deployment, served at `https://onditpas.fr` |
| Pull request | Preview deployment on a `*.vercel.app` URL, rebuilt on every commit |

The preview URL is what a ticket is verified against: open the pull request and
use the deployment link Vercel comments on it. A preview build runs the same
`npm run build`, so a fiche broken in a pull request is broken there too.

## Domain and nameservers

`onditpas.fr` is registered at Scaleway, where its nameservers currently point
at Scaleway. Moving them to Vercel makes Vercel the DNS authority for the domain
and lets it issue the certificate on its own. Everything below is a console
action: no code in this repository can do it.

1. **Vercel console** → project → *Settings* → *Domains* → add `onditpas.fr`,
   and set it as the production domain. Add `www.onditpas.fr` as well; Vercel
   then redirects `www` to the apex with a single 308.
2. Still on that screen, Vercel shows the nameservers the domain must use
   (a pair named `ns1.vercel-dns.com` / `ns2.vercel-dns.com` at the time of
   writing). Read them off the screen; do not copy them from a document, they
   can change.
3. **Scaleway console** → *Domains* → `onditpas.fr` → *Nameservers* (serveurs
   DNS) → choose the custom / external DNS option → enter the two Vercel
   nameservers → save.
4. Wait for propagation. `dig +short NS onditpas.fr` must return the Vercel
   pair; hours are normal, a day is possible.
5. Back in the Vercel console, the domain turns to *Valid Configuration* and a
   certificate is issued automatically. *Force HTTPS* is on by default and must
   stay on.

Then check the result from a terminal:

```sh
curl -sI https://onditpas.fr/publique   # 200, and no Location header
curl -sI http://onditpas.fr/publique    # a single 308 towards https
```

A `Location` header on the first command, or more than one hop, means a redirect
chain: fix it in the Vercel domain settings before calling the launch done.

### Attention before switching

Moving the nameservers takes DNS authority away from Scaleway: any record
hosted there (mail, a verification TXT, another subdomain) stops resolving
unless it is recreated in the Vercel project. Walk the Scaleway zone before the
switch and copy every record that is not the apex website record.

Keeping the zone at Scaleway is possible instead — an `A` record for the apex
towards the Vercel anycast address and a `CNAME` for `www` towards
`cname.vercel-dns.com` — but the spec makes Vercel the DNS authority, so
delegation is the documented path.

## What only the site owner can do

- Create the Vercel project and import the GitHub repository (first link
  between the two accounts).
- Read the assigned nameservers from the Vercel console.
- Switch the nameservers in the Scaleway console.
- Confirm the certificate issued and *Force HTTPS* is on.

Everything else — the build, the output directory, the URL behaviour, the tests
that hold the configuration in place — is committed.
