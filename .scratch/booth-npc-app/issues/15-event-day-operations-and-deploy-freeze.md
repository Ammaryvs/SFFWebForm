# Event-day operations and deploy freeze

Type: grilling
Status: resolved
Blocked by: 08

## Question

Surfaced by [Stack, hosting and the NFC URL](01-stack-hosting-and-the-nfc-url.md): capture and dashboards ship from one deployment, so a dashboard change during the event can break lead capture. What are the rules that stop that happening?

- **The freeze.** What is frozen, from when, and who is allowed to lift it? Does the freeze cover the whole event or only floor hours?
- **The hotfix path.** Something *will* need fixing mid-event. What is the one documented route — who deploys, what is smoke-tested before it goes out, and how is the visitor app verified still working afterwards?
- **Third-party incidents.** Vercel or Supabase having a bad hour during a 3-day event is a real possibility. What degrades and what fails outright? Is there a fallback that still captures a Lead — even a paper one?
- **Who holds what.** The event PIN, Vercel and Supabase access, the NFC tag writer. What happens if the one person holding them is off the floor?
- **Pre-event checklist.** What is verified before doors open — a real tap on a real phone, on both iOS and Android, on the actual hall network.
- **Monitoring.** How does anyone notice that submissions have stopped arriving? A silent failure at a booth is invisible until the data is reviewed days later.

This ticket is scoped to the **technical** runbook. The human side — what staff say, how they hand the phone over — remains fog on the map.

## Answer

Roles below are named slots, filled from [Name and provision the event-day duty holders](19-name-event-day-duty-holders.md).

### 1. The freeze

**Frozen during floor hours; deploys batch to an overnight window.**

- **Floor hours** = 30 minutes before doors open until 30 minutes after close. Nothing deploys in that span. Not a dashboard tweak, not a copy fix, not a "one-line" change.
- **Overnight window:** after close, the release owner may deploy. Every deploy is followed by the smoke test below, and the result is verified **before doors reopen** — never left until morning.
- **Only the release owner authorises a deploy.** Over a 3-day event this gives two real fix windows without ever risking capture in front of visitors.
- **Accepted cost:** a bug found at 10am lives until that evening. The mitigation is the rollback carve-out, not an exception to the freeze.

**Rollback is explicitly NOT a deploy, and is permitted at any time, including floor hours.** Reverting to the known-good build that was verified before doors opened *reduces* risk rather than adding it, and Vercel's instant rollback does not rebuild. This is the only change permitted while doors are open, and it is the correct first response to a capture failure discovered mid-floor.

### 2. The hotfix path

One documented route, so nobody improvises under pressure:

1. Release owner confirms the problem is real and reproducible — not one visitor's odd phone.
2. If lead capture is broken **now**, roll back first, diagnose second.
3. Fix on a branch, deploy to a Vercel preview, never straight to production.
4. Run the smoke test against the preview.
5. Promote, then run the smoke test again against production.
6. Record what changed in the runbook, so the next person is not doing archaeology.

**Smoke test — visitor path first, dashboards last:**

- Tap a real NFC tag on a real phone; confirm the app opens on the pinned production alias.
- Complete a full session end to end; confirm the Lead lands in the database.
- Confirm the footfall beacon fired on open — ticket 08 makes this the headline metric.
- Confirm the Staff View shows the new Lead.
- Only then check the dashboard.

**The service-worker trap, inherited from ticket 08 and very easy to get wrong:** the smoke test **must run in a browser that already has the old service worker installed**. A fresh incognito window will pass while every returning phone is still being served the old build. Keep one designated "dirty" test phone that is never cleared, precisely for this.

Supporting build requirements: the precache manifest is keyed to the build id so a deploy invalidates it, and the worker uses skipWaiting plus clients.claim so a hotfix applies on next load rather than after a tab close.

### 3. Third-party incidents

Ticket 08's design means these degrade very differently, and it is worth knowing which is which before it happens rather than during:

| Failure | What happens | Severity |
| --- | --- | --- |
| **Supabase down** | App loads from the service worker, the whole conversation runs, the terminal POST fails and **queues on the device**, draining when Supabase returns. | **Degrades gracefully.** Visitors notice nothing. Leads are delayed, not lost. |
| **Vercel down, phone never loaded the app** | The tap fails outright. There is nothing cached to fall back to. | **Hard failure.** This is the real outage risk. |
| **Vercel down, phone already loaded** | Service worker serves the app; behaves like the Supabase row above. | Degrades gracefully. |
| **Both down** | New visitors cannot start at all. | **Hard failure.** Fallback below. |

**Fallback: a pre-cached staff tablet.** A designated tablet that has already loaded the app holds it in the service-worker cache, so it keeps running a **full scored conversation** through a Vercel outage and queues submissions through a Supabase one. This preserves the actual qualification rather than degrading to a name and an email.

Requirements, without which it silently stops being a fallback at all:

- **Keep the cache warm.** Someone opens the app on the tablet as part of the pre-open checklist, every day.
- **Never auto-clear browsing data** on that device. Clearing it destroys the fallback, invisibly.
- **It must not be the same device running the Staff View**, which needs the network and would be down anyway.
- **Accepted cost:** one device means one visitor at a time. During an outage that is a queue, not a solution — but it beats a total stop, and it keeps the conversation intact.

### 4. Monitoring — the Staff View is the monitor

**Chosen against the recommendation.** No dead-man's switch. Recording the trade, and the mitigation that makes the choice work:

The weakness is that staff cannot distinguish *broken* from *quiet*, and they are busy talking to visitors. That is fixable inside the choice rather than by adding a system — **requirements pushed to [Live booth staff view](09-live-booth-staff-view.md):**

- A prominent **"last lead received: N minutes ago"** timestamp. This is what converts watching a list into a signal a busy person can read at a glance.
- A **Supabase Realtime connection indicator.** If the socket drops, the list silently stops updating and looks identical to a quiet spell — that is the precise failure mode, and it must be visible.
- Both belong in persistent chrome, not buried in a corner.

**Residual gap, stated plainly:** during a Vercel outage the Staff View is down too, so monitoring disappears exactly when it is most needed. The staff tablet still captures leads in that window, but nobody will have a live count. Accepted.

### 5. Who holds what

- **Every credential is held by at least two people.** A single holder who is off the floor, asleep, or unreachable is a single point of failure across a 3-day event.
- Covers the Vercel project, the Supabase project, the event PIN, and the NFC tag writer.
- The event PIN is never printed on anything visitor-facing, and is rotated after the event — both from ticket 01.
- Names and provisioning: [ticket 19](19-name-event-day-duty-holders.md).

### 6. Pre-event checklist

Run before doors open **every day**, not only on day one:

- Real NFC tap on a real **iOS** phone and a real **Android** phone, on the **actual hall network** — not office wifi.
- Complete one full session end to end; confirm the Lead lands and the beacon fired.
- Staff View loads, PIN works, Realtime indicator green, last-lead timestamp updating.
- Dashboard loads.
- **Warm the fallback tablet's cache** by opening the app on it.
- Confirm the running production build is the one verified last night.
- Confirm staff know the consent-withdrawal procedure below.

### 7. Duties inherited from other tickets

- **The 90-day deletion job (ticket 07).** A scheduled job hard-deletes Leads 90 days after the event. It must be scheduled and verified *before* the event, not remembered afterwards — the entire point of choosing a fixed window was that it does not depend on anyone remembering. The data owner confirms it ran.
- **Consent withdrawal at the booth (ticket 07).** Ticket 07 made booth staff the on-the-spot route, which makes this a **staff duty rather than a software feature**. Staff must be briefed: take the visitor's name and company email, note the request, pass it to the staff lead, and the data owner actions the deletion after the event. Visitors who ask later reach the withdrawal contact named in ticket 17.
- **Service-worker cache-busting (ticket 08).** Covered in the hotfix path above.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 09 | Must add a last-lead-received timestamp and a Realtime connection indicator. These are load-bearing monitoring now, not decoration. |
| 11 | The visitor app must also work on the fallback tablet's viewport, not phones only. |
| 14 | The spec carries the runbook, the daily checklist and the smoke test verbatim. |
| 18 | Rehearsal must exercise the dirty-service-worker test phone and the fallback tablet. |
| 19 | New task: names and credentials for every role above. |

### Duties added by ticket 12, 2026-08-31

Two additions to the runbook, both load-bearing:

1. **Nightly pack generation and forwarding.** At the close of each event day, the data owner presses **Generate Packs** on the dashboard and forwards each BU's file to its owner. This is what makes §13's 24-hour promise achievable, so it is a named nightly duty rather than an assumption — it belongs in the same end-of-day block as the deploy window.
2. **The 90-day deletion job must also purge Supabase Storage.** The job as originally specified deletes `leads` rows only. The generated packs are copies of the same personal data living in object storage, so deleting the table alone keeps the retention promise in letter while leaving a dozen spreadsheets of prospect PII sitting indefinitely. The data owner verifies both the table and the bucket are empty.

### Monitoring premise restored by ticket 09, 2026-08-31

This ticket chose "the Staff View doubles as the monitor" over a dead-man's switch, on the basis that staff would be watching it. Ticket 09 then put the Staff View on **staff phones**, which broke that basis — a pocketed phone monitors nothing.

**Closed by a dedicated counter tablet** running the Staff View solely as a monitor, face-up and always awake, while staff work the queue from their phones. The pre-open checklist gains two items:

- Confirm the **monitor tablet** is awake, signed in, connection dot green and the last-lead clock moving.
- Confirm it is **not** the offline fallback tablet — those are two distinct devices with different jobs, and during an outage the fallback is in a visitor's hands.

No dead-man's switch is built. Detection remains human, but it is now genuinely passive rather than depending on someone thinking to look.

### Withdrawal routing added by ticket 17, 2026-08-31

The check-in form now prints **dataprotectionofficer@uobgroup.com** as the withdrawal contact — UOB's published, monitored DPO mailbox.

**The DPO cannot action a deletion in this app.** The data lives in Supabase, outside UOB systems, with no route in. So the runbook carries a named step:

> A withdrawal or access request arriving at the DPO mailbox is **forwarded to this project's data owner**, who performs the deletion and confirms back.

Without that hop the address is a well-signposted dead end. Someone at UOB must know to forward it, which means the data owner has to be introduced to whoever monitors that mailbox **before** the event, not after the first request arrives.
