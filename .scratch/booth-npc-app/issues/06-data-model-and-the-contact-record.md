# Data model and the contact record

Type: grilling
Status: resolved
Blocked by: 03, 04, 05

## Question

What is the schema — the tables, fields and types — behind the session, the visitor and the lead?

- **Session vs visitor.** Footfall is sessions; contacts are visitors. One person may tap twice. How do the two relate, and does a second tap by the same company email create a new lead or update the existing one?
- **Answer storage shape.** Typed columns per question (readable, brittle to tree changes) or a normalised answer log (flexible, needs a view to be readable)? The tree may change right up to the event, which argues one way.
- **What is stored when.** Partial records for visitors who abandon after check-in but before the CTA — kept, or discarded? This interacts with the consent decision.
- **Derived vs stored.** Are score, band and routed BU computed on read, or frozen onto the record at submission? Frozen is auditable; computed lets a scoring bug be fixed after the event.
- **The Excel export's columns.** The exact one-row-per-lead shape a BU owner or organiser opens, in reading order.

## Answer

### Correction first — Company Name was lost along the way

Brief §2 collects **Name, Company Name, Company Email**. `CONTEXT.md` defines Check-in as "name, company and company email". §16's staff mock-up displays *ABC Pte Ltd*.

But ticket 07's field enumeration reads "Full Name, Company Email, Role, and Phone as genuinely optional", and ticket 03's node table copied it. **Company Name was dropped by accident, not by decision.** It is not recoverable from the email domain — `acme.com.sg` is not *ABC Pte Ltd* — and both the Staff View and the export need it.

**Restored.** Check-in is: Full Name, Company Name, Company Email, Role, Phone (optional), plus the two consent boxes.

### Three tables

**`sessions`** — one row per Tap. No personal data, ever, because the beacon fires before consent exists.

| Column | Type | Note |
| --- | --- | --- |
| `session_id` | uuid PK | Client-minted on app open |
| `tapped_at` | timestamptz | The Footfall event |
| `engaged_at` | timestamptz null | Set when the visitor reaches `interest` — see below |
| `user_agent` | text | |
| `source` | text | `nfc` default, `tablet` for the ticket 15 fallback device |

**`leads`** — one immutable row per *completed* session. Append-only.

| Group | Columns |
| --- | --- |
| Identity | `id` uuid PK · `session_id` uuid unique · `submitted_at` timestamptz |
| Contact | `full_name` · `company_name` · `company_email` · `role` · `phone` null |
| Derived | `email_domain` · `is_corporate_domain` bool |
| Answers | `interest` · `need` · `timeline` null · `intent` null — option ids as text |
| Scoring | `need_points` · `timeline_points` · `intent_points` · `influence_points` · `fit_points` · `provisional_score` · `engagement_points` · `final_score` · `band` · `scoring_version` |
| CTA | `cta_action` (`bu_follow_up` / `send_info` / `explore`) · `cta_wording_shown` |
| Routing | `primary_bu` · `secondary_bu` null |
| State | `is_incomplete` bool · `handled_at` null · `handled_by` null · `retention_exempt` bool default false |
| Consent | `consent_version` · `consent_purpose_given` bool · `consent_phone_given` bool · `consent_at` timestamptz |

**`consent_versions`** — the evidential half of ticket 07.

| Column | Type |
| --- | --- |
| `version` | text PK |
| `purpose_text` | text — the exact sentence shown |
| `phone_text` | text |
| `notice_text` | text |
| `effective_from` | timestamptz |

Ticket 07 requires consent in *evidential form*: the wording shown, its version, the timestamp, and which boxes. Storing the full sentence on all 2,000 rows would be redundant, so the lead stores the **version plus timestamp plus booleans**, and the wording lives once per version. Reconstructing exactly what any visitor agreed to is a single join. **If the wording is edited, a new version row is inserted — never an update**, or the evidence is destroyed retroactively.

### Answer storage — typed columns, settled by uniform depth

Four columns, one per node. The ticket framed this as flexible-versus-brittle, but ticket 03's uniform four-node spine removed the tension: there are always exactly four answers, so the ragged-depth case that made a normalised answer log attractive no longer exists. Option ids are just strings, so options can change up to the event without a migration — only the *shape* is fixed, and the shape is now guaranteed.

`timeline` and `intent` are nullable because an early exit can skip them. `interest` and `need` are not — reaching the CTA at all means passing through both.

### Score is frozen, inputs retained, version tagged

`final_score`, `band` and `primary_bu` are written at submission and never mutate. This matters more than ordinary auditability: **the visitor was shown a CTA chosen from that band**, so a later recompute would make the record contradict what actually happened at the booth.

The full per-category breakdown, the raw answers and a `scoring_version` are stored alongside. A scoring bug is therefore fixable without rewriting history — recompute into a new column, compare, and leave the original intact. It also answers the question staff will ask on day one: *why did this lead score 65?*

### Duplicate taps — append-only, dedupe downstream

Every completed session writes its own Lead. Nothing is ever overwritten, because an upsert would let a casual second pass destroy a richer first conversation, and at a booth the second tap is usually the throwaway one.

**Deduplication is a rule of the export and Staff View, not the store:** group by lowercased `company_email`, keep the **highest `final_score`**, break ties by latest `submitted_at`. Because it lives downstream, the rule can be changed after the event without any data being lost — which would be impossible under an upsert.

`CONTEXT.md`'s Session-and-Visitor distinction survives: `sessions` is the Session, a Lead is a Session that reached Check-in, and a Visitor is the identity that emerges from grouping Leads by email. No `visitors` table is needed for a three-day event.

### What is stored when

| Visitor behaviour | `sessions` | `leads` |
| --- | --- | --- |
| Taps, closes immediately | row written | none |
| Reaches the Interest node, abandons | row, `engaged_at` set | none |
| Exits early via the persistent exit, reaches CTA | row | row, `is_incomplete` true, nulls in unanswered columns |
| Completes | row | row, `is_incomplete` false |
| Declines consent | row | **none** — Submit never fires |

### A gap this exposes for ticket 10

**§17's funnel has an "Engaged Visitors" stage (1,250) that has no data source.** Under ticket 08's single terminal POST the only observable events are a Tap and a completed Lead, so the middle of the brief's own funnel is unmeasurable.

The cheap fix is in the schema above: `sessions.engaged_at`, set by a **second PII-free beacon** fired when the visitor reaches the `interest` node — one extra beacon, no personal data, after consent. That restores §17's stage exactly. Recommended, but it is **ticket 10's metric to confirm**, so the column is specified and the decision is flagged rather than assumed.

### Retention mechanics

The 90-day job deletes from `leads` where `retention_exempt` is false. `retention_exempt` is set from the `handled_at` marker when a Lead becomes an active lead or customer — ticket 07's carve-out, and the reason that marker is load-bearing for data protection rather than mere workflow.

**A useful property falls out:** `sessions` holds no personal data, so it is never deleted. Footfall, engagement and the funnel's shape **survive the 90-day deletion**, while every identifiable record is destroyed on schedule. The organiser keeps their numbers; the visitors keep their privacy.

### Export shape — one row per lead, reading order

For a BU owner opening the sheet, most decision-useful first:

`Band` · `Score` · `Name` · `Company` · `Role` · `Email` · `Phone` · `Interest` · `Need` · `Timeline` · `Intent` · `CTA chosen` · `Primary BU` · `Submitted at` · `Handled`

Labels are rendered from option ids at export time, never stored as labels. Ticket 12 owns filtering and delivery; this is the column contract.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 03 / 07 | **Company Name restored to check-in.** Both field lists were wrong. |
| 09 | Staff View dedupes on email at read time; `handled_at` is the marker it sets. |
| 10 | Confirm the `engaged_at` beacon, or drop §17's Engaged stage as unmeasurable. |
| 11 | Check-in form is five fields plus two checkboxes. |
| 12 | Export column contract above; dedupe rule is highest score per email. |
| 15 | Deletion job filters on `retention_exempt`; `sessions` is never deleted. |

### Confirmed by ticket 10, 2026-08-31

`sessions.engaged_at` is **confirmed** — a second PII-free beacon fires at the `interest` node, restoring §17's Engaged stage.

No further columns are needed. Interest option rank, used to expose the below-the-fold bias from ticket 03, is **derivable** from the option id because the option order is fixed config. **If that order is ever changed, an `interest_order_version` must be stored on the lead**, or historical ranks silently become wrong.
