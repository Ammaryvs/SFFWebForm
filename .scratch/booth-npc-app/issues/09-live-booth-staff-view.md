# Live booth staff view

Type: prototype
Status: resolved
Blocked by: 04, 05

## Question

What does the booth staff screen actually look like and do?

Best answered by building a rough clickable mock (`/prototype`) with fake leads, then reacting to it.

- **The card.** The brief's section 16 sketch — visitor, interest, need, timeline, intent, score, recommended action. Is that the right set, and what is the reading order under booth conditions, where it is glanced at rather than studied?
- **Arrival.** How does a new lead appear — realtime push, or a poll? A poll is much cheaper and a few seconds of delay may not matter.
- **The HOT alert.** What signals a HOT lead — sound, colour, a banner? A noisy convention floor makes sound unreliable and a silent banner easy to miss.
- **Working the queue.** Can staff mark a lead as handled or handed off, and does that state feed the dashboard's *BU Handoffs* number?
- **Access.** Shared link plus PIN, magic link, or a login? Staff devices are shared and the event is short.
- **Form factor.** A tablet on the counter, or staff phones? That decides the layout.

## Comments

### Prototype built 2026-08-31 — awaiting reaction

**Asset:** [`prototypes/staff-view-prototype.html`](../prototypes/staff-view-prototype.html) · published: https://claude.ai/code/artifact/63bf7398-9578-4bec-8a6e-4b2b185a79e3

**Decided before building:**

- **Form factor: staff phones, portrait.** Chosen against the recommendation — see the monitoring gap below.
- **HOT alert: a persistent banner pinned until acknowledged.** Silent, so floor noise cannot defeat it, and it cannot scroll away unseen. The acknowledgement doubles as evidence a human actually saw the lead.

**Already settled by other tickets, not re-opened here:** Realtime push and the shared event PIN (ticket 01); leads appear only on completion, never mid-conversation (ticket 08); dedupe on email at read time (ticket 06).

**Three variants, structurally different:**

| Variant | Optimises for | Trade |
| --- | --- | --- |
| **A — Queue list** | Overview | Most leads visible at once; weakest for acting on one |
| **B — One at a time** | Acting | Newest lead fills the screen; no overview at all |
| **C — Triage split** | Working down a backlog | Unhandled as rich cards, handled collapsed to one line |

All three carry the ticket 15 monitoring chrome (connection dot, last-lead-received clock), the ticket 04 score breakdown, and the `handled_at` control.

**The simulator is the point.** Ticket 15 requires staff to recognise the *broken* states, and ticket 18 requires rehearsing them — a person cannot recognise a state they have never seen. **Drop connection** and **Quiet for 20 min** render exactly those.

**What I need reacted to:** which variant, or which parts. C is the closest to how a booth actually works — a shrinking list of people who still need attention — but A is the least to build.

### Monitoring gap closed, 2026-08-31

Choosing phones removed the premise ticket 15's monitoring decision rested on — it declined a dead-man's switch specifically *because* staff would be watching a counter screen all day, and a phone in a pocket is not watched.

**Resolution: a dedicated counter tablet running the Staff View purely as a monitor.** Staff work the queue from their phones as chosen; the tablet sits face-up showing nothing but the same screen, so the connection dot and the last-lead-received clock are passively visible all day. Ticket 15's premise is restored without building a dead-man's switch.

Requirements, or it silently stops being a monitor:

- **The screen must stay awake.** Set the device to never sleep, and have the page hold a Wake Lock. A monitor that has dimmed itself is not a monitor.
- **It is a third device.** The event now needs two tablets — the ticket 15 offline fallback (cache warm, browsing data never cleared) and this monitor. They cannot be the same device: the fallback runs the visitor app, this runs the Staff View, and during an outage the fallback is in a visitor's hands.
- **It needs the event PIN** and should be left signed in, which makes physical control of the counter part of the security story.

## Answer

**Layout: Variant C — Triage split, on staff phones in portrait.**

Prototype: [`prototypes/staff-view-prototype.html`](../prototypes/staff-view-prototype.html) · published: https://claude.ai/code/artifact/63bf7398-9578-4bec-8a6e-4b2b185a79e3

### Why C

The useful question at a booth is not *what leads exist* but **who still needs attention**. C is the only variant that answers it without reading anything, because the working list visibly shrinks as staff mark leads handled. A keeps handled and unhandled in one undifferentiated stream, so staff re-read the same rows all afternoon; B gives no overview at all, which is fatal when three people are mid-conversation.

### The screen

```
┌─────────────────────────────────┐
│ ● Live          last lead 2m ago │  monitoring chrome (ticket 15)
├─────────────────────────────────┤
│ HOT — Ammar Yusri                │  pinned banner, until acknowledged
│ ABC Pte Ltd · Cross-border  [Ack]│
├─────────────────────────────────┤
│ NEEDS ACTION — 3                 │
│  ▐ HOT  Ammar Yusri          95 │  rich cards
│  ▐ WARM Nurul Aisyah         75 │
│  ▐ QUAL Sarah Tan            50 │
│                                  │
│ EARLIER — 24                  ▸ │  collapsed
│ HANDLED — 61                  ▸ │  collapsed
└─────────────────────────────────┘
```

### Card contents and reading order

§16's field set is right, but its *order* is a document order, not a glance order. Under booth conditions the card reads:

| Position | Field | Why here |
| --- | --- | --- |
| 1 | **Band** (colour stripe + pill) | Decides whether to act at all |
| 2 | **Name and company** | Who to walk up to |
| 3 | **Score** (right-aligned, tabular) | Secondary to band — the category matters more than the number |
| 4 | **Interest · Need** | What to open the conversation with |
| — | *on tap* | Timeline, Intent, role, score breakdown, recommended action, Mark handled |

**Score sits below band deliberately.** A glancing staff member needs "is this worth interrupting myself for", which is the band. The number only matters when comparing two leads, which is a considered act, not a glance.

The **score breakdown** is always one tap away (ticket 04), because "why did this one score 65?" is the first thing a sceptical salesperson asks.

Bands, scores and BU names are all shown freely — **no visitor ever sees this screen** (ticket 13).

### Sorting — by recency, not by band

**Within "Needs action", leads sort newest first**, not highest band first.

This is the one genuinely booth-specific decision here. A lead is only actionable while the visitor is still nearby, and **presence decays with time while band does not**. A HOT lead from forty minutes ago is a person who has left the hall; a WARM lead from ninety seconds ago is standing ten feet away. Sorting by band would push the reachable person below the unreachable one.

Urgency is carried by the pinned banner and the colour stripe instead, which is what those are for.

### The ageing rule — without it, the list dies on day one

**This is the failure the prototype does not yet show, and it would appear within hours.**

Around 300 leads a day are expected. Staff will not mark every one handled — they are talking to people. Without ageing, "Needs action" grows monotonically, and by mid-afternoon on day one it is a scroll of hundreds, most of them visitors who left long ago. The shrinking-list property that made C the right choice would be destroyed by its own success.

**A lead leaves "Needs action" when it is marked handled *or* when it is more than 30 minutes old**, whichever comes first, and drops into **Earlier**.

- Nothing is deleted or hidden — Earlier is one tap away, and those leads still reach their BU through the nightly pack (ticket 12).
- 30 minutes is a config value, tuned at rehearsal (ticket 18) against how long visitors actually linger.
- It keeps the working list bounded by *booth reality* rather than by volume: it holds roughly the people who might still be within reach.

**Earlier** and **Handled** are both collapsed to a count and expandable.

### The HOT alert

A persistent, silent banner pinned above the queue, showing name, company and need, and staying until someone taps **Acknowledge**. Floor noise cannot defeat it and it cannot scroll away.

- **One banner at a time**, showing the oldest unacknowledged HOT lead; acknowledging reveals the next, with a count badge when more than one is waiting. Stacked banners would eat the whole screen at a busy moment.
- **Acknowledge is not the same as handled.** It records that a human saw the alert; `handled_at` records that the lead was actually worked. Conflating them would inflate the dashboard's Handoffs stage with leads nobody spoke to.
- Acknowledgement is local to the device and not stored — it dismisses the banner, nothing more.

### Working the queue

**Mark handled** sets `handled_at` and `handled_by`. This control is doing three jobs at once and must be easy to hit deliberately and hard to hit by accident:

1. It moves the lead out of the working list.
2. It feeds the **BU Handoffs** stage on the organiser dashboard (ticket 10).
3. It sets the **retention exemption** that stops the 90-day deletion job removing a lead a BU is still pursuing (ticket 07).

The third is the one nobody would guess from the label. It is a full-width 42px control inside the expanded card, not an icon on the row — an accidental tap has data-protection consequences.

Marking is reversible; the prototype toggles it.

### Settled elsewhere, recorded here for completeness

- **Arrival: Supabase Realtime push** (ticket 01). Leads appear only on completion, never mid-conversation (ticket 08).
- **Access: the shared event PIN** (ticket 01), short-lived cookie, rotated after the event.
- **Dedupe on email at read time**, highest score wins (ticket 06) — so a visitor who tapped twice appears once.
- **Form factor: staff phones, portrait**, plus a dedicated counter tablet running this same screen purely as a monitor. See the monitoring note above.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 06 | `handled_at` and `handled_by` on the lead; no schema change for ageing, which is computed from `submitted_at`. |
| 10 | Handoffs counts `handled_at`, **not** banner acknowledgements. |
| 15 | Pre-open checklist covers the monitor tablet; the 30-minute ageing window is a config value. |
| 18 | Rehearsal tunes the ageing window against real visitor dwell time, and must exercise both broken states. |
| 19 | Two tablets, distinct devices, distinct jobs. |
| 14 | Spec carries the section structure, the reading order, the sort rule and the ageing rule. |
