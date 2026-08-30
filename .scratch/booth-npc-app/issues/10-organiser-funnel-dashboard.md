# Organiser funnel dashboard

Type: grilling
Status: resolved
Blocked by: 04, 05

## Question

What are the exact metrics on the organiser dashboard, and which of them can the app actually observe?

- **Redefine the funnel.** With footfall equal to taps, the brief's section 17 stages need restating: taps, then started conversation, then contactable leads, then qualified leads. Give each stage a precise, countable definition — what makes a lead "contactable" versus "qualified"?
- **Draw the observability line.** *BU Handoffs* is arguably observable if staff mark leads handled. Everything below it — specialist conversations, meetings, opportunities, revenue — is CRM-side. Does the dashboard show those as blank or manually entered, or stop at handoffs?
- **The BU interest chart.** The headline "most popular BU" view, using whichever counting rule the routing ticket picks.
- **Live or post-event.** Does the organiser dashboard update during the event, or is it a post-event read? That changes how much it shares with the staff view.
- **Time and segment cuts.** Per-day, per-hour, by role, by existing-customer status — which cuts are worth the build in 4 weeks?

## Answer

### The funnel — five stages, each precisely countable

| Stage | Definition | Source |
| --- | --- | --- |
| **Footfall (Taps)** | `count(sessions)` — every app open | Footfall beacon (ticket 08) |
| **Engaged** | `count(sessions where engaged_at is not null)` — reached the `interest` node | **New second beacon** |
| **Contactable Leads** | `count(leads)` — completed a session with consent given | `leads` table |
| **Qualified Leads** | `count(leads where final_score >= 40)` — band QUALIFIED, WARM or HOT | Frozen band (ticket 04) |
| **BU Handoffs** | `count(leads where handled_at is not null)` | Staff marker (ticket 09) |

Every stage is a count the system genuinely observes. Nothing is estimated.

**The funnel is session-level throughout.** `CONTEXT.md` defines a Lead as *"a Session that reached Check-in"*, so two taps by one person are two Leads, and the stages stay on a consistent denominator. A separate **Unique Contacts** figure (distinct lowercased `company_email`) sits beside the funnel, because an organiser will reasonably want to know how many *people* they met, not just how many runs happened. Both numbers, clearly labelled, rather than one ambiguous one.

**Contactable is not a filter — it is a guarantee.** Ticket 07 gates the write on consent, so every row in `leads` has a name, a company email and consent by construction. There is no such thing as an uncontactable Lead in this system, which makes the stage a simple table count rather than a predicate.

**Incomplete sessions can never be Qualified.** Ticket 04 caps them at EXPLORATORY regardless of raw score, so a partial conversation cannot inflate the qualified count.

### The Engaged beacon

A second PII-free beacon fires when the visitor reaches the `interest` node, setting `sessions.engaged_at`. It carries only the session id and a timestamp — it is post-consent but needs nothing personal, so it stays consistent with the footfall beacon's rule.

This restores §17's stage and buys the single most useful number the funnel produces: **how many people tap and then never even start**. That gap is the one thing an NFC booth experiment most needs to learn, and without the beacon it is invisible.

### Correction to ticket 05's denominator

Ticket 05 specified the headline Interest split as counted "over every session that reached the `interest` node". **That is not observable, and this ticket corrects it.**

The beacon records only *that* the node was reached, not which option was chosen — the choice is written with the single terminal POST, so an Interest picked by someone who then abandoned is never transmitted. Per-choice visibility would need the per-node beacons that were considered and declined here.

**The Interest split is therefore counted over `leads`** — completed sessions. Ticket 05's underlying reasoning survives intact, because Interest is still the broader denominator: it includes every Lead, whereas the routed-BU view excludes `other_unrouted`. It is simply leads-wide rather than sessions-wide.

### The BU charts

- **Headline: Interest distribution over all Leads** — matching §17's own *BU Interest* table, whose rows are Interests rather than BUs. `just_exploring` maps to §17's existing "Other" row.
- **Second view: routed BU** over Leads with a routable BU, excluding `other_unrouted`. This is what a BU head actually wants — real demand rather than curiosity.

**The below-the-fold caveat must be visible on the chart itself, not buried in a footnote.** Ticket 03 put all seven Interests in a scrolling panel, so three sit below the fold and are systematically under-picked. The chart should carry a short note to that effect.

Rank does not need a new column: the Interest option order is fixed config, so the rank of any chosen option is derivable from its id. **If that order is ever changed, an `interest_order_version` must be recorded on the lead**, or historical ranks silently become wrong.

### The observability line — stop at Handoffs, but show the tail

The funnel ends at **BU Handoffs**. Everything below it in §17 — Specialist Conversations, Meetings, Opportunities, Revenue — is CRM-side and already out of scope on the map.

They are still **drawn, greyed, and explicitly labelled as not tracked here**. §17 is the organiser's mental model of this funnel; silently truncating it invites "where did the rest go?" and, worse, invites someone to assume a blank means zero. An explicit *beyond this system* tail is more honest than an absence, and costs nothing but markup.

### Live, refreshing on a timer

Server-rendered per ticket 01, re-fetching every **60 seconds**. Organisers watch the funnel build during the event, which is most of the point of having one.

**No Realtime subscription.** Ticket 15 made the Staff View's Realtime connection indicator the event's only monitoring signal, so adding a second consumer would put load on the very channel whose health is being used to detect failure. A 60-second poll is stale by a minute, which nobody watching a three-day funnel will notice.

Access is the shared event PIN from ticket 01, the same gate as the Staff View.

### Cuts — time only

- **Taps per hour**, across the event and per day.
- **Per-day totals** for each funnel stage.

That is it. Grouping by hour on `sessions.tapped_at` is nearly free, and it answers the one operational question a second event would ask: *when was the booth actually busy?* Band and role breakdowns were considered and cut — interesting, but nobody has committed to acting on them, and the map's standing instruction is to cut anything not needed to capture leads on the day.

**Two cuts are impossible and should not be attempted:** existing-customer status was dropped in ticket 04 as unverifiable, and per-node drop-off needs beacons that were declined above.

### Expected shape, as a sanity check

§17's own worked numbers give the build something to check itself against: 2,000 taps → 1,250 engaged (62%) → 900 leads (72% of engaged) → 400 qualified (44% of leads). If the live dashboard shows a wildly different shape on day one — engagement at 5%, say — that is a signal to check the beacon rather than to celebrate or panic.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 06 | Confirms `sessions.engaged_at`. No new columns; interest rank is derivable from fixed config order. |
| 05 | **Denominator corrected** — Interest split is over Leads, not all engaged sessions. |
| 08 | A second beacon now exists. Both are fire-and-forget and neither is retried. |
| 09 | `handled_at` feeds the Handoffs stage as well as ticket 07's retention exemption. |
| 15 | Dashboard is live during the event, so it is inside the deploy freeze; the pre-open checklist already covers it loading. |
| 14 | Spec carries the five stage definitions verbatim — they are countable definitions, not descriptions. |
