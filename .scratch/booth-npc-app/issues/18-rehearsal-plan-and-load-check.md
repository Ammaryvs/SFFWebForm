# Rehearsal plan and load check

Type: grilling
Status: resolved

## Question

What is the pre-event rehearsal plan, and does ~2,000 sessions over the event need any load work?

Graduated from the map's fog on 2026-08-31: it hung on the stack choice, which [Stack, hosting and the NFC URL](01-stack-hosting-and-the-nfc-url.md) settled, and on the offline design, which [Offline behaviour and submission durability](08-offline-behaviour-and-submission-durability.md) settled. Both are now resolved, and both introduced specific things that must be rehearsed on real hardware rather than assumed.

- **Real-device matrix.** Which phones must be tested before the tags are written? At minimum both iOS Safari and Android Chrome, because the queue behaves differently on each: Background Sync drains a closed tab on Chromium and **does not fire on iOS Safari**, where recovery depends on the same phone tapping again.
- **The service worker staleness rehearsal.** Ticket 08 requires that a hotfix be smoke-tested in a browser with the **old service worker already installed**. A fresh incognito window passes while every returning phone stays on the old build. What is the exact procedure, and who runs it?
- **Cold-load budget verification.** Ticket 08 sets ≤ 1.2 MB transfer and interactive in under 4 seconds. Measure it on a genuinely congested network, not office wifi.
- **NFC tap behaviour.** iOS versus Android differ in whether a tap opens the URL directly or requires a confirmation. This must be seen on real hardware before staff scripts are written.
- **Load.** ~2,000 sessions across the event is trivial for Supabase by volume; the question is peak concurrency at a busy moment. Is any load work warranted, or is measuring it enough?
- **Dress rehearsal.** Is there a full run-through at the booth with real phones and real staff, and when?

**Deadline pressure:** the tag-writing hedge from ticket 01 says write the tags as late as practical, but rehearsal needs working tags. These two pull against each other and the plan must say how.

## Answer

### 1. Two-stage rehearsal

The two failure classes fail differently and on different timelines, so they get separate rehearsals.

**Stage 1 — office dress rehearsal, roughly T-7 days.** Full flow, real devices, real staff, every procedure. This is where software and human problems surface while there is still a week to fix them.

Must exercise, not just demo:

- A complete visitor journey per device in the matrix below, tap through to CTA.
- The **persistent exit** mid-tree — ticket 08 made this the only route by which a departing visitor is captured at all, so it is a primary path now, not an edge case.
- A submission with the network forcibly killed, confirming the queue holds and drains on reconnect.
- **The iOS recovery path specifically:** kill the network, complete a session, close the tab, restore the network, then reopen the app on the *same phone* and confirm the queued payload flushes. Background Sync will not rescue this on Safari; the next-open flush is the entire mechanism and it must be seen working.
- Staff running the **consent-withdrawal procedure** from ticket 07, out loud, on a volunteer.
- Staff reading the Staff View as a monitor — including what a dropped Realtime indicator and a stale last-lead timestamp actually look like. Show them the failure state, not only the healthy one.
- The **fallback tablet** used in anger: network killed, staff hand it over, full conversation captured on it.
- The full pre-open checklist from ticket 15, timed. If it takes 25 minutes nobody will run it daily.

**Stage 2 — on-site smoke test, build day.** Only the things that are specific to the hall and cannot be simulated:

- Real NFC taps at the booth, in the booth's final physical position.
- Cold load over the actual hall network.
- Screen legibility: pixel art under convention lighting, at arm's length, on a phone held by someone standing.
- One end-to-end session that lands a real Lead, then delete that test Lead.

### 2. Device matrix

Four devices, chosen so the older pair carries the real risk:

| Device | What it proves |
| --- | --- |
| Current iPhone (Safari) | Happy path; the no-Background-Sync queue path |
| **Older iPhone** | Service worker and sendBeacon support limits |
| Current Android (Chrome) | Happy path; Background Sync draining a closed tab |
| **Budget Android** | Pixel-art scaling, small/low-density screens, slow CPU |

Two further devices already exist as requirements from ticket 15 and must be present at rehearsal, so the real inventory is **six**:

- The designated **dirty test phone**, never cleared, carrying an old service worker.
- The **fallback tablet**, with its warm cache.

### 3. The tag deadline tension — resolved

Ticket 01 says write the tags as late as practical, because the URL is only reversible until then. Rehearsal needs working tags. These are reconcilable and do not need a trade:

**Write two or three sample tags now for rehearsal; write the bulk batch as late as practical.** A handful of tags costs almost nothing, and if the URL changes before the bulk write those few are simply rewritten or binned. The hedge in ticket 01 survives intact — what it protects against is committing *all* the tags early, not testing with any.

The bulk batch must still be written in time for stage 2, so **build day is the real deadline for the URL decision**, not doors-open.

### 4. Cold-load verification

Ticket 08 sets the budget: **≤ 1.2 MB transfer, interactive under 4 seconds.**

- Verified at stage 1 against a **throttled** network profile as a proxy, since office wifi will pass trivially and prove nothing.
- Verified for real at stage 2 on the hall network. This is the only measurement that counts.
- If the budget is missed on the hall network, the lever is the images: they are the bulk of the payload, and the WebP re-encode from ticket 08 should already have taken roughly 650 KB down to about 250 KB. Confirm that actually shipped.

### 5. Service-worker staleness rehearsal

Ticket 15 requires hotfixes to be smoke-tested against an installed old service worker. That procedure is itself rehearsed, or it will be attempted for the first time under pressure at 11pm:

1. Load the current build on the dirty test phone. Do not clear it, ever.
2. Deploy a trivially visible change.
3. Reopen on the dirty phone and confirm the new build is served on next load, without clearing data.
4. If it is not, the precache manifest is not keyed to the build id, or skipWaiting/clients.claim are missing — and that is a build bug found a week early rather than mid-event.

The release owner runs this, not a tester, because the release owner is who will need it during the event.

### 6. Load — no engineering, just measurement

The arithmetic settles it. ~2,000 sessions across three days, at roughly 8 floor hours a day, is about **1.4 sessions per minute average**. Allowing a 10x burst at a peak moment gives ~14 per minute, or **about 0.23 writes per second**, plus one beacon per tap. Supabase's free tier absorbs that with orders of magnitude to spare, and ticket 08's single terminal POST means one write per completed session rather than five.

**No load testing or capacity work is warranted.** The genuine risks are elsewhere and none of them is database throughput:

- The **hall network**, which cannot be load-tested by us and is mitigated by the offline design instead.
- **Vercel cold starts** on the submit function after idle periods. Worth one measurement at stage 2; if it bites, a trivial keep-warm ping during floor hours fixes it.
- **Realtime subscriber count** on the Staff View, which is a handful of devices at most.

### 7. NFC tap behaviour

Observed on real hardware at stage 1 and confirmed at stage 2, because iOS and Android differ and staff scripts depend on what actually happens:

- Whether the tap opens the URL directly or shows a confirmation the visitor must accept.
- Whether the phone must be unlocked, and where the antenna is on each device, since that determines where the tag physically goes on the booth.
- What happens on a tap when the phone has no data connection at all.

Findings here feed the staff opening line, which remains fog on the map.

### Schedule consequence, stated plainly

A T-7 office rehearsal means the build must be **feature-complete a week before the convention**, with only fixes after that. The convention is under four weeks out and the spec is not finished, which leaves roughly two weeks of build time once it lands. That is tight but not unreasonable for this scope — it is recorded here because the rehearsal date is what makes it a hard constraint rather than an aspiration.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 14 | The spec carries both rehearsal stages, the device matrix and the sample-tags-now rule. |
| 15 | The pre-open checklist is timed at rehearsal; the dirty-phone procedure is rehearsed, not just written. |
| 11 | Pixel-art scaling on a budget Android and legibility under hall lighting are now explicit test criteria. |
| 19 | The release owner must personally run the service-worker staleness rehearsal. |
