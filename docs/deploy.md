# Deploying

Spec §3, §15 and §17 govern this. The short version: **the NFC tags point
at one pinned production alias, and during floor hours nothing deploys.**

## First deploy

```bash
npx vercel login
npx vercel link          # project name becomes the URL — choose it carefully
npx vercel --prod
```

**The project name is visitor-facing.** It becomes
`<name>.vercel.app`, which is what the NFC tag encodes and what a visitor
reads in their address bar. A bank sending someone to a non-bank domain
runs against instincts banks train into customers, so the name must be
legible and obviously branded — `uob-booth`, not `bu-recommender-final-2`.

### Environment variables

Set in **Project Settings → Environment Variables**, or:

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS on a table of prospect PII. It is
server-side only and must never gain a `NEXT_PUBLIC_` prefix.

Add them to the **Preview** environment too, or preview deployments — which
the hotfix path in §15 depends on — cannot reach the database.

### After the first deploy

- [ ] Tap through a full session on a real phone. Confirm the lead lands
      (`node scripts/inspect-lead.mjs`), then delete the test lead
      (`node scripts/inspect-lead.mjs --delete <session_id>`).
- [ ] Confirm the service worker registered (DevTools → Application →
      Service Workers). Over HTTPS it will; over plain HTTP on a LAN
      address it never does, which is why local testing cannot prove this.
- [ ] Confirm the production alias is stable and **write it on the tags**.
      Never an auto-generated per-deployment URL: those change on every
      deploy and would break every tag.

## The URL is the point of no return

Tags are cheap to repoint until they are physically written and expensive
after. **Write two or three sample tags now for rehearsal; the bulk batch
as late as practical. Build day is the hard deadline.**

## During the event

**Frozen during floor hours** — 30 minutes before doors open to 30 minutes
after close. Nothing deploys: not a dashboard tweak, not a copy fix, not a
"one-line" change. Capture and the dashboards ship from one deployment, so
a dashboard change can break lead capture.

Deploys batch to an overnight window, authorised only by the release owner,
smoke-tested, and verified before doors reopen.

### Rollback is not a deploy

**Rollback is permitted at any time, including floor hours.** Reverting to
the build verified before doors opened *reduces* risk, and Vercel's
rollback does not rebuild. It is the correct first response to a capture
failure discovered mid-floor.

```bash
npx vercel rollback
```

### The hotfix path

1. Release owner confirms the problem is real and reproducible.
2. **If capture is broken now, roll back first, diagnose second.**
3. Fix on a branch, deploy to a preview — never straight to production.
4. Smoke test the preview.
5. Promote, then smoke test production.
6. Record what changed in the runbook.

### Smoke test — visitor path first, dashboards last

Tap a real tag on a real phone → complete a full session and confirm the
lead lands → confirm the footfall beacon fired → confirm the Staff View
shows it → only then check the dashboard.

**Run it on the dirty test phone** — one designated phone with the old
service worker installed that is never cleared. A fresh incognito window
passes while every returning phone stays broken.

## Why the build id matters

The service worker keys its precache to `NEXT_PUBLIC_BUILD_ID`, derived in
`next.config.mjs` from `VERCEL_GIT_COMMIT_SHA`, then `VERCEL_DEPLOYMENT_ID`,
then `VERCEL_URL`. Only the first is populated for Git-connected deploys;
the other two exist on every deploy including CLI ones.

If that value ever became constant, the precache would never invalidate and
a hotfix would serve the old app to every returning phone. Ticket 18's
service-worker staleness rehearsal exists to catch exactly that, and the
release owner runs it personally.

## Node version

`engines.node` is pinned to `22.x`, which Vercel reads. Keep the
development machine on the same major version — `nvm install 22`. Node 20
lacks a native `WebSocket`, which `supabase-js` needs for Realtime; Next's
server runtime polyfills it but plain scripts have no such luck, and the
Staff View depends on Realtime.
