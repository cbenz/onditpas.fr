# ADR 0001 — The domain's DNS authority stays at Scaleway

Status: accepted, 2026-11-18.

## Context

The spec (`#1`) makes Vercel the DNS authority for `onditpas.fr`: the nameservers
at Scaleway are delegated to Vercel, which then hosts the zone and issues the
certificate on its own. `docs/deploy.md` documented that path, and the whole
switch was attempted.

It failed on this account. The registry accepted the pair at Scaleway, and
AFNIC then published it, but no Vercel nameserver hosted the zone:
`dig +short SOA onditpas.fr @<nameserver>` answered `REFUSED` for the generic
pair and for the sharded ones tried next. The Vercel console kept the domain at
*Invalid Configuration* and, instead of the nameservers it expected, offered the
external-DNS fallback: a per-project `A` record and a per-project `CNAME`.

Nothing was at stake in the zone itself. It held no `MX`, no `TXT` and no `A`
record before the attempt, and AFNIC publishes no `DS`, so no DNSSEC delegation
could break either way.

## Decision

Keep the zone at Scaleway, on Scaleway's nameservers (`ns0.dom.scw.cloud`,
`ns1.dom.scw.cloud`), and point the apex at Vercel with an `A` record plus a
`CNAME` for `www`. The values are read from the Vercel console, never copied
from a document, because they are specific to the project.

## Consequences

- The site behaves identically: same build, same routes, same certificate
  issued by Vercel, same single 308 from `www` to the apex.
- Mail or verification records can live at Scaleway later without being migrated
  a second time.
- A wildcard domain would be impossible this way; Vercel requires its own
  nameservers for it. Nothing in the spec asks for one.
- Vercel manages no record, so the apex `A` target is a value to re-read on the
  console if a deployment ever stops answering. `dig +short A onditpas.fr` and
  `dig +short CNAME www.onditpas.fr` are the two checks.
- The deviation is confined to DNS authority: `vercel.json`, the catch-all
  rewrite, the redirects emitted by the build and the tests that hold them are
  unaffected.
