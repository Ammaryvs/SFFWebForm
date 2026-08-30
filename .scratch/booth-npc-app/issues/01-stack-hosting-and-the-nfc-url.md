# Stack, hosting and the NFC URL

Type: grilling
Status: resolved

## Question

What is the app built on, where does it run, and what exact URL goes on the NFC tag?

Settle these together, because they constrain each other:

- **Framework.** The conversation runs entirely client-side and must survive bad convention wifi. Does that argue for a static SPA with a thin API, or a full framework (Next.js/Remix) for the sake of the dashboards?
- **Host and DB.** Where does it deploy, and what is the source-of-truth DB? The spine says a small hosted DB, not the Excel workbook.
- **One app or three?** Visitor app, live staff view and organiser dashboard have different audiences and auth needs. One deployment with routes, or separate surfaces?
- **The URL.** NFC tags are written once and are painful to rewrite. It must be short, stable, HTTPS, and ideally on a domain that survives a hosting change. Custom domain or platform subdomain?
- **Auth for the two dashboards.** Staff view and organiser dashboard are not public. Shared link plus PIN, magic link, or a real login?

Constraints: under 4 weeks to the event; standalone app with no InfoSec gate; must serve roughly 2,000 sessions over the event; visitors are on their own phones.

## Answer

### Stack

**Next.js (App Router) on Vercel, with Supabase Postgres as the source of truth.**

- **Supabase Realtime** carries new Leads to the Staff View — this removes the need to build any push infrastructure, and means the poll-versus-push question in [Live booth staff view](09-live-booth-staff-view.md) can lean toward push.
- API routes that talk to a spreadsheet API must run on the **Node runtime, not Edge** — the Microsoft Graph and Google Sheets SDKs need Node built-ins. This is a hard input to [Cloud Excel export mechanism](02-cloud-excel-export-mechanism.md).
- TypeScript throughout, with **one shared types module** covering the Node graph, the Lead Score and the Lead record, imported by both the visitor app and the two internal surfaces.
- 2,000 Leads is trivially inside Supabase's free tier; the constraint is concurrency at peak, not volume.

### Rendering: the visitor route is client-rendered

The visitor route is **client-rendered with the entire conversation Node graph bundled as a static JSON import**. No network round trip per Node. This is the single decision that makes the offline requirement cheap rather than expensive, and it is why a scripted tree was chosen over an LLM at charting.

SSR is used only for `/staff` and `/dashboard`, which are always online by definition.

### Topology: one deployment, three route groups

```
/            visitor app        (client-rendered, offline-tolerant)
/staff       live Lead view     (SSR + Supabase Realtime)
/dashboard   organiser funnel   (SSR)
/api/submit  Lead intake
/api/sync    -> cloud Excel Export
```

**Consequence that must reach the spec's runbook:** because capture and dashboards ship from the same deployment, a dashboard change deployed during the event can break lead capture. The mitigation is a **deploy freeze during event hours** with a single documented hotfix path. This is the price of the single-deployment choice and it is not optional — see [Event-day operations and deploy freeze](15-event-day-operations-and-deploy-freeze.md).

### NFC URL: Vercel platform subdomain

**Decision: a Vercel platform subdomain**, chosen over a UOB-owned or purchased domain.

It must be a **pinned production alias** — e.g. `uob-booth.vercel.app` — and never an auto-generated per-deployment URL, which changes on every deploy and would break every tag.

This was chosen against the recommendation, with the trade-offs stated. Recording them so they are not rediscovered later:

1. **Platform lock-in.** The tags cannot be repointed away from Vercel once written. Acceptable for a single event.
2. **Trust.** A bank booth sending visitors to a domain that is not the bank's runs against the instinct banks train customers to have. Mitigations, all of which belong in the spec:
   - Pick a legible, obviously-branded project name.
   - Print the exact URL on booth signage so the address bar confirms an expectation rather than springing a surprise.
   - Staff introduce it verbally when the visitor taps.
   - **Hard rule: the app never asks for anything credential-shaped** — no password, account number, NRIC, OTP or date of birth. Only name, company, company email, and optionally role. This rule goes in the spec as a constraint on [Full NPC dialogue copy](13-full-npc-dialogue-copy.md) and the Check-in form.
3. **The hedge.** This decision is cheap to reverse right up to the moment the NFC tags are physically written, and expensive after. So: **write the tags as late as practical.** If a `uob.com.sg` subdomain becomes available before then, switch — nothing else in the build changes.

### Auth: shared PIN for both internal surfaces

A single event PIN gates both `/staff` and `/dashboard`.

- Held by the staff lead; **never printed on the tag, a poster, or anything visitor-facing**.
- Rate-limit attempts, to stop the shared secret being brute-forced.
- Short-lived signed cookie, expiring at end of event day rather than persisting.
- Rotate the PIN after the event.

Both screens show real names and company emails behind one shared secret. That is a thin barrier, which raises the stakes on retention and deletion — flagged as an input to [PDPA consent, retention and deletion](07-pdpa-consent-retention-and-deletion.md).

### What this unblocks or constrains elsewhere

| Ticket | Effect |
| --- | --- |
| [Cloud Excel export mechanism](02-cloud-excel-export-mechanism.md) | Sync runs as a Vercel Cron job hitting a Node-runtime API route. Both candidates must work under that. |
| [Offline behaviour and submission durability](08-offline-behaviour-and-submission-durability.md) | Service worker options are now concrete: `next-pwa` or hand-rolled. Still blocked on consent. |
| [Live booth staff view](09-live-booth-staff-view.md) | Supabase Realtime is available and cheap, so push is affordable. |
| [PDPA consent, retention and deletion](07-pdpa-consent-retention-and-deletion.md) | A shared PIN over PII strengthens the case for a short retention window. |
| [Full NPC dialogue copy](13-full-npc-dialogue-copy.md) | Must satisfy the no-credential-shaped-questions rule. |
