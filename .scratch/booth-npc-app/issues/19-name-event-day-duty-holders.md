# Name and provision the event-day duty holders

Type: task
Status: resolved

## Question

Fill the named slots in the event-day runbook, and provision the access they imply.

Not a decision — [Event-day operations and deploy freeze](15-event-day-operations-and-deploy-freeze.md) settled the roles and the rules; these are names and credentials only the organisation can supply. The runbook is unusable without them.

**Roles to name:**

1. **Release owner** — the single person who authorises a deploy during the event and runs the overnight window. Needs Vercel deploy access.
2. **Release owner deputy** — because the freeze rules must still work when one person is off the floor or asleep.
3. **Staff lead** — holds the event PIN (per ticket 01), briefs staff, and owns the on-the-spot consent-withdrawal procedure from ticket 07.
4. **Data owner** — actions deletion requests after the event and runs the 90-day deletion job verification.

**Access to provision, each held by at least two people:**

- Vercel project (deploy + instant rollback)
- Supabase project (read, and the ability to run a deletion)
- The event PIN
- The NFC tag writer and the tags themselves

**Also required:**

- The **data owner must be known to whoever monitors dataprotectionofficer@uobgroup.com** before the event. Ticket 17 prints that published DPO mailbox as the withdrawal contact, but the DPO cannot delete from this app's database — every request has to be forwarded to the data owner. Introduce them in advance; discovering the gap when the first request arrives is too late.

- **Two** tablets must be identified as specific devices, with different jobs:
  - The **offline fallback tablet** (ticket 15) — browser data set never to auto-clear, since its warm service-worker cache is the outage fallback. Runs the visitor app.
  - The **monitor tablet** (ticket 09) — sits face-up on the counter running the Staff View as the event's only passive monitoring signal. Must be set to never sleep and left signed in with the event PIN.
  These cannot be the same device: during an outage the fallback is in a visitor's hands, which is exactly when the monitor is needed most.
- A contact channel that actually reaches the release owner during floor hours.

**Done when** every role above has a name, every credential has two holders, and the tablet is identified.

## Closed as out of scope — 2026-08-31

**Not resolved on the route; ruled beyond the destination.**

The destination is a **build-ready spec**. Nobody needs a person's name to build this thing — they need one to *run the event*. Naming individuals and provisioning credentials is execution, and it sits past the destination exactly as the map already treats real UOB BU owner mailboxes.

**The spec ships role slots**, and the roles below are spec content. This ticket is not abandoned: the work is still required before doors open, and the checklist is carried into the spec so scoping it out does not lose it.

Removed from ticket 14's blockers.

---

### The four roles — spec content, written here so they are not lost

Every duty below was assigned by a resolved ticket. These definitions belong in the spec verbatim; only the names are slots.

**RELEASE OWNER**
- Sole authority to deploy during the event (ticket 15).
- Runs the overnight deploy window and verifies before doors reopen.
- Runs the one documented hotfix path, including the smoke test.
- Personally runs the dirty-service-worker rehearsal (ticket 18) — they are who will need it at 11pm.
- May roll back at any time, including floor hours; rollback is not a deploy.
- *Needs:* Vercel deploy and rollback access.

**RELEASE OWNER DEPUTY**
- The same authority, exercised when the release owner is off the floor, asleep or unreachable.
- Exists because a 3-day event cannot have a single point of failure on deploys.
- *Needs:* the same Vercel access.

**STAFF LEAD**
- Holds the event PIN; never printed on anything visitor-facing; rotated after the event (ticket 01).
- Briefs staff on the Staff View, including what its **failure** states look like (ticket 09, ticket 15).
- Owns the on-the-spot consent-withdrawal procedure (ticket 07) and passes requests to the data owner.
- Runs the daily pre-open checklist (ticket 15).

**DATA OWNER**
- Generates and forwards the nightly BU packs at the close of each day (ticket 12) — this is what makes §13's 24-hour promise achievable.
- Actions deletion and withdrawal requests, including those forwarded from the UOB DPO mailbox (ticket 17).
- Verifies the 90-day deletion job ran, against **both** the database and Supabase Storage (tickets 07, 12, 15).
- *Needs:* Supabase read access and the ability to run a deletion.

### The pre-event provisioning checklist

- [ ] Each of the four roles has a named person.
- [ ] **Every credential is held by at least two people** — Vercel project, Supabase project, event PIN, NFC tag writer. A single holder is a single point of failure.
- [ ] **Two tablets identified as specific devices**, with distinct jobs:
  - **Offline fallback tablet** (ticket 15) — runs the *visitor app*, service-worker cache kept warm daily, browsing data never auto-cleared.
  - **Counter monitor tablet** (ticket 09) — runs the *Staff View* face-up as the event's only passive monitoring signal; set never to sleep, holds a Wake Lock, left signed in.
  - These cannot be the same device: during an outage the fallback is in a visitor's hands, which is precisely when the monitor matters most.
- [ ] The **data owner is introduced to whoever monitors dataprotectionofficer@uobgroup.com** (ticket 17). The DPO cannot delete from this app; every request must be forwarded. Discovering that gap when the first request arrives is too late.
- [ ] A contact channel that actually reaches the release owner during floor hours.
- [ ] Two or three **sample NFC tags** written for rehearsal; the bulk batch written as late as practical, with build day as the hard deadline for the URL (ticket 18).

### Why this is out of scope rather than unfinished

Ruling it out of scope is a scoping act, not a judgement about importance — this work genuinely must happen before the event. What it is not is a *design decision*, and the map's destination is the design. The checklist above ships inside the spec, so the obligation travels with the document rather than living only in a closed ticket.
