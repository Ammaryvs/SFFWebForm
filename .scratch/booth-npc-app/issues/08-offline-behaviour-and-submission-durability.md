# Offline behaviour and submission durability

Type: grilling
Status: resolved
Blocked by: 01, 07

## Question

What precisely happens when the convention wifi dies mid-conversation?

- **What is cached, and when.** The four asset images are the bulk of the payload. Service worker, or just aggressive HTTP caching and a single load? What is the cold-load budget on a congested hall network?
- **Submit once or per step.** A single submit at the end is simple and gives a clean record; per-step submission survives abandonment and feeds the live staff view sooner. These pull in opposite directions — pick one and say what is lost.
- **The queue.** Where does an unsent submission live (localStorage or IndexedDB), how many retries, with what backoff, and for how long? What happens if the visitor closes the tab before it sends?
- **What the visitor sees.** Is a failed send visible to them, silently retried, or does it offer a fallback such as showing the staff a code?
- **Effect on footfall.** If a session never reaches the server it never counts as a tap. Does footfall need a separate lightweight beacon fired on app open, ahead of everything else?

## Answer

### 1. Caching — service worker precaching the app shell and all four assets

A service worker precaches the app shell and the four images on first load, so the visitor app survives a **mid-conversation reload on dead wifi**. Ticket 01 already bundles the whole Node graph as static JSON, so once the shell is cached the entire conversation runs with no network at all.

**Cold-load budget on a congested hall network:** target **≤ 1.2 MB total transfer** and interactive in **under 4 seconds**. The four JPGs are ~650 KB as shipped; **re-encode them to WebP at build time** (roughly 250 KB combined, visually identical at pixel-art scale). This is an encoding change, not an art change — the four assets remain the entire art budget.

**Hazard this creates, and it is not optional to handle:** a stale service worker can serve an old app after a hotfix, which collides head-on with ticket 01's deploy freeze. Mitigations, all owned by [Event-day operations and deploy freeze](15-event-day-operations-and-deploy-freeze.md):

- Precache manifest keyed to the build id, so a new deploy invalidates it.
- `skipWaiting` + `clients.claim` so a hotfix takes effect on next load rather than after a tab close.
- The hotfix smoke test must be run **in a browser with the old SW already installed**, not a fresh incognito window. A fresh window will pass while every returning phone is still on the old build.

### 2. Submission — a single POST at the CTA

**Chosen against the recommendation, with the cost stated and accepted.** Recording the trade so it is not rediscovered:

- One clean write, the fewest failure modes, and the simplest record for ticket 06 — no transiently incomplete rows, no reconciliation of two write paths.
- **Accepted cost:** no Lead exists until a visitor reaches the CTA. A closed tab or a walk-away mid-tree leaves **nothing at all**, not even the contact details already typed. This revises ticket 03's decision 6 — amended there.
- **Accepted cost:** the Staff View is empty until a visitor finishes. Staff cannot greet someone mid-conversation.
- **Consequence:** the persistent exit from ticket 03 is now the only route by which a departing visitor is captured, so it must be **visually prominent** rather than a grudging grey row.
- PDPA is unaffected and if anything simpler: consent is captured at check-in and transmitted with the same single payload, so ticket 07's "nothing personal is transmitted without the tick" holds trivially.

### 3. The queue

- **Storage: `localStorage`.** The payload is one small JSON object per session — a few hundred bytes. IndexedDB's async robustness buys nothing at this size and costs complexity in a sub-four-week build.
- **Written before the network is attempted**, so the payload is durable even if the POST is killed mid-flight.
- **Retry: exponential backoff** — 1s, 2s, 4s, 8s, 16s, 30s, then every 30s while the tab lives. Also retried immediately on the `online` event.
- **Background Sync** is registered where available so a queued payload can drain **after the tab is closed**. This is Chromium-only — **it will not fire on iOS Safari**, which is a large share of a Singapore convention audience. It is a bonus, never the guarantee.
- **On next app open**, any queued payload from a previous session is flushed first, before the new session begins. This is the practical iOS recovery path: the same phone tapping again drains the old queue.
- **Expiry:** queued payloads are discarded 7 days after the event. A stale payload cannot be delivered into a database that is being deleted at +90d anyway, and holding personal data on a stranger's phone indefinitely is exactly what ticket 07's retention position rules out.

### 4. What the visitor sees — nothing

The queue retries silently. No network error is ever shown. The CTA confirms honestly without claiming a success it cannot verify — *"Thanks, we'll be in touch"*, never a tick that means "delivered".

Nothing at a booth is improved by telling a stranger the wifi is broken: they cannot fix it, staff cannot fix it, and it converts a good last impression into a bad one.

### 5. Footfall — a separate beacon, now mandatory

Under a single terminal POST, Lead rows only exist for visitors who finish, so **footfall cannot be derived from them**. Without a beacon, Footfall would silently mean "completed conversations" — understating the headline metric by every abandonment.

- Fired on app open, **before anything else**, ahead of asset loading.
- Contains **only** the session id, a UTC timestamp and the user agent. **No personal data whatsoever** — it fires before check-in and therefore before consent, so it must carry nothing that would need one.
- Fire-and-forget via `sendBeacon`. Never blocks the UI, never retried; an occasional lost beacon slightly understates Footfall, which is acceptable for a headline count.
- **Ticket 10 must define Footfall as the beacon count**, and treat the gap between beacons and Leads as the funnel's first and largest drop-off — which is now the app's single most informative number.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 03 | Decision 6 revised: closed tab now keeps nothing. Exit affordance must be prominent. |
| 06 | One write path, one complete row. Add the queued-payload shape; no partial-row states. |
| 09 | Staff View cannot show mid-conversation leads. Leads appear only on completion. |
| 10 | Footfall = beacon count, not Lead count. Beacon-to-Lead gap is the first funnel stage. |
| 11 | The exit affordance is now load-bearing, not decorative. Assets ship as WebP. |
| 15 | Owns SW cache-busting, and must smoke-test hotfixes against an installed old SW. |
