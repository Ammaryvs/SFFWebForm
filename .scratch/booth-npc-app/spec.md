# UOB Booth NPC Lead Recommender — Build Specification

**Status:** build-ready. Every design decision is made; nothing below awaits a further design conversation.
**Compiled:** 2026-08-31, from 17 resolved decision tickets in `.scratch/booth-npc-app/issues/`.
**Source brief:** `.scratch/booth-npc-app/brief.md` (§ references throughout point at it).

---

## 1. What this is

A visitor at the UOB convention booth taps an NFC tag with their own phone. A pixel-art receptionist opens on their screen and has a short scripted conversation with them — four questions — about what their business needs. The app captures their contact details, scores the lead, routes it to the right UOB Business Unit, alerts booth staff to hot leads in real time, and feeds an organiser dashboard.

**Design principle (§18):** it must feel like *"tell us what's happening in your business and we'll point you towards the right solution"*, never like *"please complete this 15-question survey."*

**Constraints that shaped everything:** the convention is under four weeks away, the art budget is fixed at four images, and real visitor PII is involved under Singapore's PDPA.

### The spine

```
NFC tap → check-in → interest → need → timeline → intent → CTA
             ↑                    ↖________________________↙
        consent gate            persistent exit, any node
```

Four taps after check-in. Every path is the same length.

---

## 2. Scope

**In scope:** the visitor app, the live staff view, the organiser dashboard, the post-event routed export, and the event-day runbook.

**Explicitly out of scope** — do not build these:

| Ruled out | Why |
| --- | --- |
| LLM-driven free-text NPC | Scripted tree chosen: deterministic, offline-capable, no improvising bank NPC |
| Rewards, points, prizes, leaderboards | The JRPG skin *is* the gamification |
| Separate footfall-counting hardware | Footfall is redefined as NFC taps |
| CRM integration and pipeline tracking | Everything below *BU Handoffs* is CRM-side and unobservable here |
| Real UOB BU owner mailboxes | Not available; the spec ships placeholder slots |
| UOB InfoSec / production security review | Standalone app, no approval gate |
| Multi-event reuse | Single-event build |

---

## 3. Architecture

**Next.js (App Router) on Vercel, with Supabase Postgres as the source of truth.**

```
/            visitor app        client-rendered, offline-tolerant
/staff       live lead view     SSR + Supabase Realtime
/dashboard   organiser funnel   SSR, 60s poll
/api/submit  lead intake
/api/beacon  footfall + engagement beacons
/api/packs   per-BU .xlsx generation
```

- **The visitor route is client-rendered with the entire node graph bundled as a static JSON import.** No network round trip per node. This single decision is what makes the offline requirement cheap, and it is why a scripted tree beat an LLM.
- **API routes that build spreadsheets must run on the Node runtime, not Edge** — SheetJS/ExcelJS need Node built-ins.
- TypeScript throughout, with **one shared types module** covering the node graph, the lead score and the lead record, imported by the visitor app and both internal surfaces.
- 2,000 leads is trivially inside Supabase's free tier. The constraint is peak concurrency, not volume — and at ~0.23 writes/second at a 10× burst, it is not a constraint at all.

### The NFC URL

**A pinned Vercel production alias** (e.g. `uob-booth.vercel.app`) — never an auto-generated per-deployment URL, which changes on every deploy and would break every tag.

Trade-offs accepted and recorded:

1. **Platform lock-in.** Tags cannot be repointed away from Vercel once written. Acceptable for one event.
2. **Trust.** A bank sending visitors to a non-bank domain runs against instincts banks train into customers. Mitigations are mandatory:
   - A legible, obviously-branded project name.
   - The exact URL printed on booth signage, so the address bar confirms an expectation rather than springing a surprise.
   - Staff introduce it verbally at the tap.
   - **Hard rule: the app never asks for anything credential-shaped.** No password, account number, NRIC, OTP or date of birth. Only name, company, company email, role and an optional phone.
3. **The hedge.** This is cheap to reverse until the tags are physically written and expensive after. **Write the bulk tag batch as late as practical; build day is the hard deadline.** Write two or three sample tags now for rehearsal.

### Auth for internal surfaces

A single shared **event PIN** gates `/staff` and `/dashboard`.

- Held by the staff lead. Never printed on a tag, a poster, or anything visitor-facing.
- Rate-limit attempts.
- Short-lived signed cookie, expiring at end of event day.
- **Rotate after the event.**

Both screens show real names and company emails behind one shared secret. That thinness is why retention is short and deletion is automatic.

---

## 4. Visitor UI

**Composition: full-bleed background with all chrome overlaid at the bottom**, matching `Dialog Example.jpg`. One composition on every screen; nothing switches layout mid-conversation.

- Background: `object-fit: cover`, `object-position: 50% 22%`. This keeps the receptionist centred **and crops the retail signage** (Priority Banking / Wealth Management) largely out of frame, which matters — the conversation asks about treasury and cross-border collections, and prominent wealth-management signage would clash.
- Chrome sits over a dark upward gradient: name plate, dialogue box, choice panel, or the check-in / CTA card.

### Assets — only one of the four is an image

| File | Role |
| --- | --- |
| `Background Screen.jpg` | **The only file rendered as an image.** Re-encode to WebP (~650 KB → ~250 KB). |
| `Dialog Interface.jpg` | **Reference only** — rebuild the frame in CSS |
| `Dialog Example.jpg` | **Reference only** — populated example for type, colour and choice styling |
| `Contact Detail Form.jpg` | **Reference only** — and its field list is wrong; see §7 |

A flat JPG frame cannot hold copy that changes length at every node. Everything except the background is CSS. Three of the four files never need downloading.

### Typography

**Silkscreen** (SIL Open Font License), fallback `ui-monospace, monospace`.

> **Changed during build, 2026-08-31.** This section originally specified Press Start 2P, a fixed-advance face at 1.0em per character. Silkscreen is the narrower face ticket 11 already recorded as the lever if copy proved unwritable, and is what the prototype defaulted to. Full reasoning and costs: ticket 11 comments.

**The webfont must be precached by the service worker alongside the background image** — the fallback is not metrically identical, so a runtime fetch would render the first frame at the wrong metrics.

The typeface in the original artwork is unidentified and presumed unlicensable.

### Copy budget — hard limits

Derived from the font metric and box widths on the narrowest supported phone (360px). **These figures were exact arithmetic under Press Start 2P's fixed advance. Under Silkscreen, which is proportional, they are a conservative guard rather than a measurement — the real limit is larger and wants measuring at rehearsal:**

| Element | Budget |
| --- | --- |
| **NPC dialogue line** | 3 lines × ~26 chars ≈ **78 characters** |
| **Choice option label** | **~22 characters** |

The longest line in the shipped deck is 51 characters, so there is real headroom.

### Screen inventory

| # | Screen | Composition |
| --- | --- | --- |
| 1 | Splash / cold load | Background at 72% dark overlay, spinner and wordmark |
| 2 | Check-in | Form card overlaid; 5 fields, 2 consent boxes, notice block |
| 3–6 | Conversation nodes | Name plate + dialogue box + choice panel |
| 7 | CTA / result | Card with three actions, one emphasised |
| 8 | Offline / queued | Background at 72% dark overlay, honest confirmation |

The **choice panel scrolls** — seven Interests plus the exit against roughly four visible rows. Scroll affordance is required. Rows are ≥44px tap targets.

### Palette

From a sibling UOB effort, recorded as user-confirmed there but **unconfirmed for this build** — check against the artwork before committing:

`#FFFFFF` · Azure Radiance `#005EB8` · Resolution Blue `#00237B` · light brown `#C8BFB4` · grey `#B5AEAA`. Fonts: Noto Sans / Open Sans for any non-pixel UI.

**No official panel colour exists.** The dark dialogue and choice panels use derived blends of Resolution Blue.

---

## 5. The conversation node graph

Twelve nodes on a linear spine. **The only branch in the entire graph is `interest` selecting which of seven `need` nodes is visited.**

| Node id | Options (ids) | Next |
| --- | --- | --- |
| `checkin` | form — see §7 | `interest` |
| `interest` | `.growing` `.managing_cash` `.payments` `.financing` `.managing_risk` `.digitalising` `.just_exploring` | `need.<chosen>` |
| `need.growing` | `.local` `.asean` `.greater_china` `.anz` `.europe` `.us` `.other_overseas` | `timeline` |
| `need.managing_cash` | `.visibility` `.optimise_excess_cash` `.access_to_funds` `.working_capital` | `timeline` |
| `need.payments` | `.too_manual` `.too_many_platforms` `.cross_border` `.reconciliation` `.get_paid_faster` `.processing_time_cost` | `timeline` |
| `need.financing` | `.growth` `.working_capital` `.specific_investment` `.trade` | `timeline` |
| `need.managing_risk` | `.fx_exposure` `.fx_rates` `.volatility` `.interest_rate` `.minimal_fx` | `timeline` |
| `need.digitalising` | `.payments` `.collections` `.reconciliation` `.cash_management` `.reporting` `.trade` `.other` | `timeline` |
| `need.just_exploring` | `.growing` `.cash` `.payments` `.financing` `.risk` `.digitalising` `.nothing_specific` | `timeline` |
| `timeline` | `.immediate` `.1_3_months` `.3_6_months` `.6_12_months` `.no_timeline` | `intent` |
| `intent` | `.actively_looking` `.considering` `.researching` | `cta` |
| `cta` | terminal — three actions, band-selected emphasis | end |

**40 need options in total.** Node and option ids are stable snake_case, never renumbered, never reused.

### Rules

- **Uniform depth.** Every path is exactly four nodes. The brief's "one relevant follow-up" (§18) and its ragged Financing chain (§7: type → planning → timing) are both replaced — Financing's chain folds exactly onto the spine, with type as `need`, planning state as `intent` and timing as `timeline`.
- **"Just Exploring" stays on the spine**, with softer wording, rather than bypassing qualification as §10 proposes. This deliberately catches the visitor who self-describes as browsing but answers with an immediate timeline — a maximum-score lead the brief would have discarded.
- **A persistent exit appears on every node** and leads to the CTA. Under a single terminal submit this is the *only* route by which a departing visitor is captured at all, so **render it prominently**, not as a grudging grey row.
- **`timeline` uses §12's scale**, not §4/§5/§7's differing ones, because §12 is the only scale that has to compute.

### Two brief signals deliberately not captured

Both were lead-quality discriminators in the brief and are lost to uniform depth. Recorded, not hidden:

- **FX frequency (§8)** — *"high-frequency FX exposure + clear pain point = strong lead"*.
- **Current tooling (§9)** — *"distinguishes general curiosity from an active digitalisation project"*. Someone on spreadsheets is a better lead than someone on an ERP.

If either matters, promote it into that branch's option labels rather than adding a fifth node.

---

## 6. Dialogue copy

**Voice:** warm but brief — a real receptionist. Contractions, plain words, one human beat per line. No jokes, no game-speak. She acknowledges each answer before the next question, which is what makes it a conversation rather than a form and confirms a tap in a scrolling panel registered. **She never uses the visitor's name** (no first-name extraction, no mangled names).

### NPC lines

| Node | Line | Chars |
| --- | --- | --: |
| `interest` | Welcome to UOB! What's most relevant to your business right now? | 64 |
| `need.growing` | Growth it is. Are you growing locally or heading overseas? | 58 |
| `need.managing_cash` | Cash flow, then. What would help most day to day? | 49 |
| `need.payments` | Payments it is. What's the biggest headache today? | 50 |
| `need.financing` | Financing, got it. What are you looking to fund? | 48 |
| `need.managing_risk` | Risk, then. Where does it bite hardest? | 39 |
| `need.digitalising` | Digitalising, nice. Which part would you fix first? | 51 |
| `need.just_exploring` | No problem. Anything you're curious about? | 42 |
| `timeline` *(standard)* | Got it. When are you looking to sort this out? | 46 |
| `timeline` *(soft)* | Fair enough. Is this a now thing or a someday thing? | 52 |
| `intent` *(standard)* | Last one. How are you approaching this right now? | 49 |
| `intent` *(soft)* | Last one. Are you looking around or digging in? | 47 |

*Soft* register is used on the `just_exploring` branch.

### Option labels

| Node | Labels |
| --- | --- |
| `interest` | Growing · Managing Cash · Payments · Financing · Managing Risk · Digitalising · Just Exploring |
| `need.growing` | Growing locally · Into ASEAN · Into Greater China · Into Australia / NZ · Into Europe · Into the US · Somewhere else |
| `need.managing_cash` | Seeing cash clearly · Using spare cash · Access to funds · Working capital |
| `need.payments` | Too manual · Too many platforms · Cross-border · Reconciliation · Getting paid faster · Cost or speed |
| `need.financing` | Growth or expansion · Working capital · A specific investment · Trade |
| `need.managing_risk` | FX exposure · Better FX rates · Market swings · Interest rates · We barely use FX |
| `need.digitalising` | Payments · Collections · Reconciliation · Cash management · Reporting · Trade · Something else |
| `need.just_exploring` | Growing · Cash flow · Payments · Financing · FX and risk · Going digital · Nothing specific |
| `timeline` | Now / under a month · 1-3 months · 3-6 months · 6-12 months · No set timeline |
| `intent` | Actively looking · Considering options · Just researching |
| **exit (every node)** | **Skip to the end** |

**The exit must not read like an Interest.** "I'm just looking around" sat one row under "Just Exploring" and led to the opposite outcome — hence "Skip to the end".

### CTA screen

**Headline is identical for all four bands:** `Thanks! How can we help from here?` A headline that warmed for HOT and cooled for EXPLORATORY would tell the visitor how they had been graded.

| Band | First action reads | Emphasised |
| --- | --- | --- |
| HOT | `Talk to a Specialist` | action 1 |
| WARM | `Request a Follow-Up` | action 1 |
| QUALIFIED | `Talk to a Specialist` | action 2 |
| EXPLORATORY | `Talk to a Specialist` | action 3 |

Actions 2 and 3 are constant: `Send Me Information` · `Explore Solutions`. **All three are always present and selectable in every band** — a HOT lead can still just take a brochure, which is what makes Engagement a real signal.

### Edge copy

| State | Copy |
| --- | --- |
| Splash | `UOB` / `Loading…` |
| Sent **or** queued offline | `Thanks! We'll be in touch soon.` / `You're all set.` |

**Identical whether the submission landed or queued.** It promises contact — true in both cases — and never claims delivery it cannot verify.

**A returning tapper sees the standard flow with no acknowledgement.** This is forced, not lazy: the beacon carries no PII, the conversation is client-side, and nothing transmits until the CTA, so the app cannot know it has met someone until after they finish.

### Prohibitions — audited across the whole deck

Never visible to a visitor: **BU names**, the **score**, the **band**, or any qualification language (qualify, assess, evaluate, rank, score). The only bank-side words a visitor sees are "UOB" and "specialist". No credential-shaped ask appears anywhere.

---

## 7. Check-in, consent and PDPA

### Fields

**Full Name · Company Name · Company Email · Role (dropdown) · Phone (optional)**

The reference artwork shows Name / Email / Phone / **Address** and no company field — it is wrong. **Address is dropped**: it feeds no scoring, no routing and no follow-up, and collecting it fails purpose limitation. Company Name is required — §2 collects it, the staff view displays it, and it is not derivable from an email domain.

**Role dropdown options** (these *are* the scoring tiers):
`Owner, C-suite or Director` · `Manager or finance role` · `Executive, analyst or other`

**Free-mail addresses must never be rejected.** `gmail.com` scores zero on company fit but is a valid entry; blocking it turns a scoring signal into a barrier.

### Consent

Two unticked boxes. The first gates Submit; the second is enabled only when a phone number is entered.

> ☐ **I agree that UOB may contact me about the solutions we discuss here today.**
>
> ☐ *(phone only)* **UOB may call or SMS me on this number about those solutions.**

Notice below, as notice rather than consent:

> United Overseas Bank Limited collects your name, company email and role to follow up on this conversation. We keep it for 90 days, then delete it. To withdraw, speak to our booth staff or contact dataprotectionofficer@uobgroup.com. [Privacy notice]

Privacy notice link: `https://www.uob.com.sg/assets/web-resources/uobgroup/pdf/privacy/uob-privacy-corporate.pdf`

**Validation:** `Please enter your name.` · `Please enter your company.` · `That email doesn't look right.` · `Please tick the box to continue.`

### The consent position

- **Scope is narrow** — follow-up on this conversation only, not marketing. A BU wanting more seeks its own consent later.
- **Placement is at check-in**, the point of collection. The purpose is fully stateable before the conversation: *contact me about the solutions we discuss here*.
- **The CTA choice is a preference, not a second consent**, and must never be worded as though it grants anything.
- **Phone brings PDPA Part 9 (DNC Registry) into scope.** A Singapore number may not be called or SMSed for marketing without a DNC check or clear and unambiguous consent *in evidential form* — hence the separate box, and the evidential consent record in §10.
- **No tick, no transmission.** Submit stays disabled; no unconsented personal data ever leaves the device.

### Retention and deletion

- **90 days after the event, then hard delete**, by a scheduled job — not by anyone remembering.
- **Carve-out:** a lead that has become an **active lead or customer** is exempt; normal UOB banking retention governs that relationship. Without this, the job would delete a lead a BU was mid-pursuit on. The `handled_at` marker is the input, which makes it data-protection machinery, not workflow convenience.
- **The deletion job must also purge generated export packs from Supabase Storage.** They are copies of the same personal data; deleting only the table keeps the promise in letter and breaks it in substance.
- **Withdrawal:** booth staff action it on the spot. Later requests reach the DPO mailbox — which **cannot delete from this app**, so the runbook requires forwarding to the data owner.

### Not legally reviewed

This is a defensible design, not a compliance sign-off. Three things warrant a DPO's eye:

1. The design leans on PDPA's **business-contact-information** carve-out for a B2B audience.
2. The **DNC** treatment of the optional phone number.
3. **The linked notice does not describe this situation.** It states it *"forms a part of the terms and conditions governing your relationship with United Overseas Bank"* and covers data of shareholders and directors for *"products and services which you have applied for."* A booth visitor has neither. A short event-specific notice is the cleaner fix if there is time.

Also unaddressed and worth a position: **security baseline** (encryption at rest, HTTPS in transit), **minors** (presumed absent; write it down), and **breach notification** (an operational process, but someone must own it).

---

## 8. Lead scoring

### Two phases — this is forced, not stylistic

§12 scores Engagement from the CTA choice; §14 selects the CTA from the band; the band comes from the score. That is a closed loop. It is broken like this:

```
answers          → provisional score (0–90) → provisional band
provisional band → which CTA is emphasised
visitor chooses  → Engagement (0 or 10)
final score      = provisional + Engagement   (0–100)
final band       = band(final score)
```

**The provisional band only decides CTA presentation. The final band is stored, shown to staff, and used for routing and handoff.** A lead may move up a band by choosing a specialist — correct, since agreeing to a follow-up genuinely is a stronger signal.

### Phase 1

| Category | Input | Points |
| --- | --- | --: |
| **Need** | `need.*` is a concrete option | 25 |
| | `need.just_exploring.nothing_specific` or `need.managing_risk.minimal_fx` | 10 |
| **Timeline** | `.immediate` / `.1_3_months` / `.3_6_months` / `.6_12_months` / `.no_timeline` | 20 / 15 / 10 / 5 / 0 |
| **Intent** | `.actively_looking` / `.considering` / `.researching` | 20 / 10 / 5 |
| **Decision influence** | Owner-C-suite-Director / Manager-finance / Executive-analyst-other | 15 / 10 / 5 |
| **Company fit** | corporate email domain / free-mail domain | 10 / 0 |

**Provisional maximum 90**, so HOT (80+) is reachable before the CTA. **Provisional minimum is 20, not 0** — everyone answers `need` (≥10), `intent` (≥5) and has a role (≥5). EXPLORATORY still has a live 20–39 range; nobody will ever score zero, which is not a bug.

Departures from §12, each deliberate:

- **Need merges §12's two rows.** "Clear business need +15" fired for every visitor under uniform depth and discriminated nothing; "specific pain point +10" had no defined input anywhere in the brief.
- **Company fit is repurposed** from "strategic / target company" — a list that does not exist — to corporate-versus-free email domain, computable at check-in and genuinely discriminating at a B2B booth. Needs a maintained free-mail domain list (gmail, yahoo, hotmail, outlook, icloud, proton, qq, 163, common disposables). Accepted cost: a small business on a free address loses 10 points.
- **Existing-customer status is dropped** entirely — unverifiable without UOB systems, which are out of scope.
- **Role is always present**, so there is no missing-data rule. Self-reported seniority is inflatable; accepted.

### Phase 2

**Engagement = +10 if the visitor picks the BU follow-up action**, 0 otherwise. Scored on the action, not the wording, so HOT and WARM score identically for the same decision.

### Bands (§13) — applied to the final score

🔥 **HOT** 80–100 · 🟠 **WARM** 60–79 · 🟡 **QUALIFIED** 40–59 · ⚪ **EXPLORATORY** 0–39

### Incomplete sessions

Unanswered categories score 0. **A session that did not answer all four nodes is capped at EXPLORATORY (39)** regardless of computed score — otherwise someone answering only `need` with a senior title and corporate domain scores 50 and lands in QUALIFIED on a third of a conversation. The raw score is still stored.

### Worked examples

| # | Session | Need | Time | Intent | Role | Fit | Prov. | Band | CTA | Final |
| --- | --- | --: | --: | --: | --: | --: | --: | --- | --- | --- |
| 1 | CFO, working capital within 2 months *(§13's own example)* | 25 | 15 | 20 | 15 | 10 | 85 | HOT | Specialist | **95 HOT** |
| 2 | Finance manager, reconciliation, 3–6 months, considering | 25 | 10 | 10 | 10 | 10 | 65 | WARM | Send info | **65 WARM** |
| 3 | Analyst, reporting, 6–12 months, researching | 25 | 5 | 5 | 5 | 10 | 50 | QUALIFIED | Send info | **50 QUALIFIED** |
| 4 | Browser, nothing specific, no timeline, free email | 10 | 0 | 5 | 5 | 0 | 20 | EXPLORATORY | Explore | **20 EXPLORATORY** |
| 5 | "Just exploring" but urgent — Payments, immediate, actively looking, Director | 25 | 20 | 20 | 15 | 10 | 90 | HOT | Specialist | **100 HOT** |

All four bands reachable. Example 1 lands within a point of the brief's own figure of 85. **Example 5 is the lead §10's bypass would have thrown away.**

---

## 9. BU routing

Eight canonical BUs, collapsing §15's slashed pairs. **These names are placeholders** — real names and owner mailboxes drop in as config.

`business_banking` · `cash_management` · `transaction_banking` · `trade_finance` · `markets_treasury` · `digital` · `corporate_investment` · `other_unrouted`

### The routing function

Routing keys off the **need option id alone** — the `(interest, need)` pair is fully determined by it — so this is a flat 40-row lookup, not a path walk. **Timeline and intent change the band, never the BU.**

| Need option | Primary BU |
| --- | --- |
| all seven `need.growing.*` | `business_banking` |
| `need.managing_cash.visibility` `.optimise_excess_cash` `.access_to_funds` | `cash_management` |
| `need.managing_cash.working_capital` | `business_banking` |
| all six `need.payments.*` | `transaction_banking` |
| `need.financing.growth` `.working_capital` | `business_banking` |
| `need.financing.specific_investment` | `corporate_investment` |
| `need.financing.trade` | `trade_finance` |
| `need.managing_risk.fx_exposure` `.fx_rates` `.volatility` `.interest_rate` | `markets_treasury` |
| `need.managing_risk.minimal_fx` | `other_unrouted` |
| all seven `need.digitalising.*` | `digital` |
| `need.just_exploring.growing` · `.financing` | `business_banking` |
| `need.just_exploring.cash` | `cash_management` |
| `need.just_exploring.payments` | `transaction_banking` |
| `need.just_exploring.risk` | `markets_treasury` |
| `need.just_exploring.digitalising` | `digital` |
| `need.just_exploring.nothing_specific` | `other_unrouted` |

**Coverage is total** — all 40 options appear exactly once. **Write a test asserting the routing config's key set equals the graph's need-option set**, because the tree may change up to the event.

Notes:

- §15's *Acquisition / M&A → Corporate / Investment Banking* row was otherwise unreachable; `need.financing.specific_investment` is mapped to it. A judgement call — the alternative is routing it to `business_banking` and deleting the row.
- **`other_unrouted` has no owner and is excluded from the per-BU export.** Those leads still exist, are still contactable, and appear in the dashboard's "Other" row — but nobody is asked to chase them. They are exactly the two options scoring 10 rather than 25, so scoring and routing agree on who said nothing actionable.

### Secondary BUs

`secondary_bu` exists on the schema and is **null everywhere**. One lead with two owners is chased twice or not at all, and the export needs an unambiguous key. Recorded for if it is ever enabled: `need.payments.cross_border` and `.get_paid_faster` → `cash_management`; `need.digitalising.cash_management` → `cash_management`; `need.digitalising.trade` → `trade_finance`; `need.managing_cash.working_capital` → `cash_management`.

### Config shape

```json
{
  "businessUnits": {
    "transaction_banking": { "label": "Transaction Banking", "ownerEmail": "" }
  },
  "routing": {
    "need.payments.cross_border": { "primary": "transaction_banking", "secondary": null }
  }
}
```

**The lead record stores the BU id, never the label**, so renaming a BU does not rewrite history.

---

## 10. Data model

Three tables.

### `sessions` — one row per tap. No personal data, ever.

| Column | Type | Note |
| --- | --- | --- |
| `session_id` | uuid PK | Client-minted on app open |
| `tapped_at` | timestamptz | The footfall event |
| `engaged_at` | timestamptz null | Set when the visitor reaches `interest` |
| `user_agent` | text | |
| `source` | text | `nfc` default, `tablet` for the fallback device |

### `leads` — one immutable row per **completed** session. Append-only.

| Group | Columns |
| --- | --- |
| Identity | `id` uuid PK · `session_id` uuid unique · `submitted_at` |
| Contact | `full_name` · `company_name` · `company_email` · `role` · `phone` null |
| Derived | `email_domain` · `is_corporate_domain` bool |
| Answers | `interest` · `need` · `timeline` null · `intent` null (option ids as text) |
| Scoring | `need_points` · `timeline_points` · `intent_points` · `influence_points` · `fit_points` · `provisional_score` · `engagement_points` · `final_score` · `band` · `scoring_version` |
| CTA | `cta_action` (`bu_follow_up`/`send_info`/`explore`) · `cta_wording_shown` |
| Routing | `primary_bu` · `secondary_bu` null |
| State | `is_incomplete` bool · `handled_at` null · `handled_by` null · `retention_exempt` bool |
| Consent | `consent_version` · `consent_purpose_given` bool · `consent_phone_given` bool · `consent_at` |

### `consent_versions` — the evidential half

| Column | Type |
| --- | --- |
| `version` | text PK |
| `purpose_text` · `phone_text` · `notice_text` | text — the exact strings shown |
| `effective_from` | timestamptz |

PDPA requires consent in *evidential form*. Storing the sentence on all 2,000 rows is redundant, so the lead stores **version + timestamp + booleans** and the wording lives once. **Editing wording inserts a new version row — never an update**, or the evidence is destroyed retroactively.

### Rules

- **Answers are four typed columns.** Uniform depth guarantees exactly four answers, which removes the case that made a normalised answer log attractive. Option ids are strings, so options can change up to the event without migration. `timeline` and `intent` are nullable (early exit); `interest` and `need` are not.
- **Score, band and BU are frozen at submission and never mutate.** The visitor was shown a CTA chosen from that band, so a recompute would make the record contradict what happened. The breakdown, raw answers and `scoring_version` are stored, so a bug is recomputable into a *new* column without rewriting history — and staff can answer "why did this score 65?"
- **Duplicate taps each write their own row.** An upsert would let a casual second pass destroy a richer first conversation. **Dedupe is a read-time rule** of the export and staff view: group by lowercased `company_email`, keep the highest `final_score`, ties broken by latest `submitted_at`. Living downstream, it can change after the event.
- **Interest option rank** (for the below-the-fold bias, §13) is derivable from the option id given fixed config order. **If that order ever changes, store `interest_order_version` on the lead** or historical ranks silently become wrong.

### What is stored when

| Visitor behaviour | `sessions` | `leads` |
| --- | --- | --- |
| Taps, closes immediately | row | none |
| Reaches Interest, abandons | row + `engaged_at` | none |
| Exits early, reaches CTA | row | row, `is_incomplete` true |
| Completes | row | row |
| Declines consent | row | **none** |

**`sessions` holds no personal data, so it is never deleted.** Footfall and the funnel's shape survive the 90-day purge while every identifiable record is destroyed on schedule.

---

## 11. Offline behaviour and durability

### Caching

**A service worker precaches the app shell, the background image (WebP) and the Silkscreen webfont** on first load, so the app survives a mid-conversation reload on dead wifi. With the node graph bundled as static JSON, the whole conversation runs with no network.

**Cold-load budget: ≤ 1.2 MB transfer, interactive under 4 seconds** on a congested hall network.

**The stale-worker hazard is not optional to handle:**

- Precache manifest keyed to the build id, so a deploy invalidates it.
- `skipWaiting` + `clients.claim`, so a hotfix applies on next load rather than after a tab close.
- **Hotfix smoke tests must run in a browser with the old worker already installed.** A fresh incognito window passes while every returning phone stays broken. Keep one designated "dirty" test phone that is never cleared.

### Submission — a single POST at the CTA

One clean write, fewest failure modes, no partial rows to reconcile. **Accepted costs, stated plainly:**

- **No lead exists until the visitor reaches the CTA.** A closed tab or walk-away mid-tree leaves nothing at all — not even the contact details already typed.
- **The Staff View is empty until a visitor finishes.** Staff cannot greet someone mid-conversation.
- Consequently the persistent exit is the only capture route for a departing visitor, and must be prominent.

### The queue

- **`localStorage`** — the payload is a few hundred bytes; IndexedDB buys nothing at this size.
- **Written before the network is attempted**, so it survives a POST killed mid-flight.
- **Exponential backoff:** 1s, 2s, 4s, 8s, 16s, 30s, then every 30s while the tab lives; retried immediately on `online`.
- **Background Sync** registered where available so a payload can drain after the tab closes. **This never fires on iOS Safari** — a large share of a Singapore audience. It is a bonus, never the guarantee.
- **On next app open, any queued payload flushes first.** This is the practical iOS recovery path.
- **Queued payloads expire 7 days after the event.** Holding personal data on a stranger's phone indefinitely contradicts the retention position.

### What the visitor sees

**Nothing.** The queue retries silently; no network error is ever shown. The CTA confirms honestly without claiming a success it cannot verify. Nothing at a booth is improved by telling a stranger the wifi is broken.

### Beacons — both mandatory, both PII-free

| Beacon | Fires | Carries |
| --- | --- | --- |
| **Footfall** | On app open, before anything else | session id, UTC timestamp, user agent |
| **Engagement** | On reaching the `interest` node | session id, timestamp |

Fire-and-forget via `sendBeacon`, never retried; an occasional loss slightly understates a headline count, which is acceptable.

**Both must carry no personal data** — the footfall beacon fires before consent exists. Without them, footfall would silently mean "completed conversations", understating the headline metric by every abandonment.

---

## 12. Live staff view

**On staff phones, portrait.** Realtime push via Supabase. Access by the shared event PIN.

### Layout — triage split

```
┌─────────────────────────────────┐
│ ● Live          last lead 2m ago │
├─────────────────────────────────┤
│ HOT — Ammar Yusri                │  pinned until acknowledged
│ ABC Pte Ltd · Cross-border  [Ack]│
├─────────────────────────────────┤
│ NEEDS ACTION — 3                 │  rich cards
│ EARLIER — 24                  ▸ │  collapsed
│ HANDLED — 61                  ▸ │  collapsed
└─────────────────────────────────┘
```

The useful question at a booth is *who still needs attention*, and this is the layout where that list visibly shrinks.

### Card reading order

**Band** (colour stripe + pill) → **name and company** → **score** (right-aligned, tabular) → **interest · need**. On tap: timeline, intent, role, **score breakdown**, recommended action, Mark handled.

Score sits below band deliberately: a glancing staff member needs *is this worth interrupting myself for*, which is the band. The number only matters when comparing, which is a considered act.

Bands, scores and BU names are shown freely — **no visitor ever sees this screen**.

### Sorting — by recency, not band

**Presence decays with time; band does not.** A 40-minute-old HOT lead has left the hall; a 90-second-old WARM is standing ten feet away. Sorting by band would push the reachable person below the unreachable one. Urgency is carried by the banner and stripe.

### The ageing rule

**A lead leaves "Needs action" when marked handled *or* once it is more than 30 minutes old**, whichever comes first, dropping into **Earlier**.

Without this, at ~300 leads a day and staff who are busy talking to people, the working list grows monotonically until it is a scroll of hundreds — destroying the very property that makes this layout right. Nothing is deleted; Earlier is one tap away and those leads still reach their BU. **30 minutes is config, tuned at rehearsal.**

### The HOT alert

A **silent, persistent banner** pinned above the queue with name, company and need, staying until **Acknowledge**. Floor noise cannot defeat it and it cannot scroll away.

- **One banner at a time**, oldest unacknowledged first, with a count badge if more wait.
- **Acknowledge ≠ handled.** Acknowledge records that a human saw the alert; `handled_at` records the lead was worked. Conflating them would inflate BU Handoffs with leads nobody spoke to. Acknowledgement is device-local and not stored.

### Mark handled — three jobs

1. Moves the lead out of the working list.
2. Feeds **BU Handoffs** on the dashboard.
3. **Sets the retention exemption** that stops the 90-day job deleting a lead a BU is still pursuing.

The third is unguessable from the label, so it is a full-width ≥42px control inside the expanded card, not an icon on a row. Reversible.

### Monitoring chrome — load-bearing

Because there is no dead-man's switch, these are the only way anyone learns capture has stopped:

- **A "last lead received: N minutes ago" clock.**
- **A Supabase Realtime connection indicator.** A dropped socket makes a stalled list look identical to a quiet spell.

Both in persistent chrome. **Staff must be shown these failure states during rehearsal** — nobody recognises a state they have never seen.

---

## 13. Organiser funnel dashboard

SSR, **live during the event on a 60-second poll**. Not Realtime — the Staff View's Realtime channel is the monitoring signal and must not gain a second consumer. Access by the shared event PIN.

### The funnel — five countable stages

| Stage | Definition |
| --- | --- |
| **Footfall (Taps)** | `count(sessions)` |
| **Engaged** | `count(sessions where engaged_at is not null)` |
| **Contactable Leads** | `count(leads)` |
| **Qualified Leads** | `count(leads where final_score >= 40)` |
| **BU Handoffs** | `count(leads where handled_at is not null)` |

Every stage is genuinely observed; nothing is estimated.

- **The funnel is session-level throughout** (a Lead is a session that reached check-in), so two taps by one person are two leads. A separate **Unique Contacts** figure (distinct lowercased email) sits alongside, so nobody has to guess whether a number means runs or people.
- **"Contactable" is a guarantee, not a filter.** Consent gates the write, so every lead has name, email and consent by construction.
- **Incomplete sessions can never be Qualified** (capped at EXPLORATORY).

### BU charts

- **Headline: Interest distribution over all leads**, matching §17's own *BU Interest* table whose rows are Interests. `just_exploring` maps to §17's existing "Other" row.
- **Second view: routed BU**, over leads with a routable BU.
- **The below-the-fold caveat must appear on the chart**, not a footnote: three of seven Interests start below the fold in a scrolling panel and are systematically under-picked.

The Interest split is counted over **leads**, not all engaged sessions — the beacon records that the node was reached, never which option was picked.

### The observability line

The funnel **ends at BU Handoffs**. §17's stages below it — Specialist Conversations, Meetings, Opportunities, Revenue — are CRM-side and out of scope, but are still **drawn, greyed and labelled "not tracked here"**. §17 is the organiser's mental model; a blank invites someone to read it as zero.

### Cuts

**Time only** — taps per hour, and per-day totals for each stage. Grouping by hour is nearly free and answers the one operational question a second event would ask.

Two cuts are **impossible**: existing-customer status (dropped as unverifiable) and per-node drop-off (needs beacons that were declined).

### Sanity check

§17's worked numbers give the build something to check itself against: 2,000 → 1,250 → 900 → 400. If day one shows engagement at 5%, that is a broken beacon, not a bad booth.

---

## 14. Export and handoff

### Mechanism

**Generate a real `.xlsx` server-side and write it to Supabase Storage.** A Node-runtime API route queries Postgres, builds the workbook with SheetJS or ExcelJS, and writes to a stable path. **Full rewrite every time** — no append contention, no partial-write state.

The Microsoft Graph route was investigated and is **ruled out at the auth layer**: the Excel workbook API does not support app-only permissions at all (`EditModeAccessDenied`), and requires OneDrive for Business or SharePoint. The only server-side path would be a delegated flow on a real person's refresh token — reintroducing the tenant approval this project avoids, breaking silently when policy changes, and running as a named employee over a file of prospect PII.

*Fallback if a live browsable sheet is ever genuinely wanted:* Google Sheets via a service account, full-rewrite on the same schedule. Quotas are two orders of magnitude clear at this scale. It is a real option, just heavier — and it is not Excel.

### The packs

**One `.xlsx` per BU, never one master forwarded to everyone** — a shared workbook would disclose every other BU's prospects to each owner for no upside. A **master workbook** for the organiser only is also produced, and is the only artefact containing `other_unrouted` leads.

Filename: `uob-booth-<bu_id>-<YYYY-MM-DD>.xlsx`

**Columns, in reading order:**
`Band` · `Score` · `Name` · `Company` · `Role` · `Email` · `Phone` · `Interest` · `Need` · `Timeline` · `Intent` · `CTA chosen` · `Submitted at` · `Handled`

Sorted by **Score descending**, then `Submitted at` descending. Option ids render as labels at export time. `Primary BU` is dropped from per-BU packs and kept in the master.

**Every lead for that BU is included regardless of band.** These people consented and named a real need; filtering out EXPLORATORY means someone who asked to be contacted never is. Band is the first column, so the BU sets its own bar.

### The consent gate at the export boundary

Purpose consent needs no filter — it gated the write. **But:**

> **The `Phone` cell is empty wherever `consent_phone_given` is false**, even when a number is stored.

A BU owner cannot call a number they were never given. This makes the DNC position structural rather than dependent on someone reading a policy note.

### Cover sheet

Each pack's first tab states: the consent purpose these leads agreed to (follow-up on this conversation, **not** general marketing), the 90-day retention expectation, that an empty Phone cell means no call or SMS consent, and that the recipient owns their copy from the moment it is forwarded. **This is the only thing that travels with the data once it leaves.**

### Schedule and delivery

A **Generate Packs** button on the organiser dashboard, behind the event PIN. It regenerates everything and lists download links; the **data owner forwards each pack to its BU owner**.

Automated emailing is deliberately not built — it needs the owner mailbox list, which does not exist, and would ship as dead configuration or misdirect PII. The manual step also puts human eyes on the data before it leaves.

**Packs are generated at the close of every event day, and once after the event.** Because a day's packs generate at that day's close, **every HOT lead reaches its BU within 24 hours of capture**, including day three — §13's promise is met for the whole event. Packs are **cumulative**, so a lost or unforwarded pack is self-healing.

The live HOT alert remains the *primary* same-day mechanism: an in-person handoff at the booth beats any email. The daily pack is the backstop for leads no specialist could see.

---

## 15. Event-day operations

Roles below are **named slots**; see §17.

### The freeze

**Frozen during floor hours** — 30 minutes before doors open to 30 minutes after close. Nothing deploys: not a dashboard tweak, not a copy fix, not a "one-line" change. Capture and dashboards ship from one deployment, so a dashboard change can break lead capture.

**Deploys batch to an overnight window**, authorised only by the release owner, smoke-tested, and **verified before doors reopen**. Over three days this gives two real fix windows. Accepted cost: a bug found at 10am lives until that evening.

**Rollback is explicitly not a deploy and is permitted at any time, including floor hours.** Reverting to the build verified before doors opened *reduces* risk, and Vercel's rollback does not rebuild. It is the correct first response to a capture failure discovered mid-floor.

### The hotfix path

1. Release owner confirms the problem is real and reproducible.
2. **If capture is broken now, roll back first, diagnose second.**
3. Fix on a branch, deploy to a preview — never straight to production.
4. Smoke test the preview.
5. Promote, then smoke test production.
6. Record what changed in the runbook.

**Smoke test — visitor path first, dashboards last:**
Tap a real tag on a real phone → complete a full session and confirm the lead lands → confirm the footfall beacon fired → confirm the Staff View shows it → only then check the dashboard.

**Run it on the dirty test phone** with the old service worker installed.

### Third-party incidents

| Failure | Behaviour | Severity |
| --- | --- | --- |
| **Supabase down** | App loads from cache, conversation runs, POST queues and drains later | **Degrades gracefully** — visitors notice nothing |
| **Vercel down, phone never loaded the app** | Tap fails outright, nothing cached | **Hard failure** — the real risk |
| **Vercel down, phone already loaded** | Service worker serves the app; queues | Degrades gracefully |
| **Both down** | New visitors cannot start | **Hard failure** |

**Fallback: a pre-cached staff tablet.** A designated tablet that has already loaded the app keeps running a **full scored conversation** through a Vercel outage and queues through a Supabase one — preserving the qualification rather than degrading to a name and email.

Requirements, without which it silently is not a fallback: **cache warmed daily**; **browsing data never auto-cleared**; **not the device running the Staff View**. One device means one visitor at a time — a queue, not a solution, but better than a stop.

### Monitoring

**No dead-man's switch.** Detection is the Staff View's connection indicator and last-lead clock, made passive by a **dedicated counter monitor tablet** face-up all day (see §17).

**Residual gap, accepted:** during a Vercel outage the Staff View is down too, so monitoring disappears exactly when most needed. The fallback tablet still captures, but nobody has a live count.

### Daily pre-open checklist

Run **every day**, not only day one:

- [ ] Real NFC tap on a real **iOS** phone and a real **Android** phone, on the **actual hall network**.
- [ ] One full session end to end; lead lands, beacon fired.
- [ ] Staff View loads, PIN works, connection indicator green, last-lead clock updating.
- [ ] Dashboard loads.
- [ ] **Monitor tablet** awake, signed in, connection green.
- [ ] **Warm the fallback tablet's cache** by opening the app on it.
- [ ] Running production build is the one verified last night.
- [ ] Staff know the consent-withdrawal procedure.

### Nightly duties

- [ ] Generate and forward the per-BU packs (§14).
- [ ] Deploy window, if needed, then verify.

### Standing duties

- **The 90-day deletion job** must be scheduled and verified *before* the event, covering **both the database and Supabase Storage**. The data owner confirms it ran.
- **Consent withdrawal at the booth** is a staff duty, not a feature: take the name and company email, note the request, pass to the staff lead; the data owner actions the deletion after the event.
- **A request arriving at the DPO mailbox must be forwarded to the data owner** — the DPO cannot delete from this app.

---

## 16. Rehearsal and load

### Two stages

**Stage 1 — office dress rehearsal, ~T-7 days.** Full flow, real devices, real staff, every procedure, while there is still a week to fix findings. Must exercise, not demo:

- A complete journey per device in the matrix below.
- **The persistent exit mid-tree** — now a primary path, not an edge case.
- A submission with the network killed, confirming the queue holds and drains.
- **The iOS recovery path specifically:** kill network, complete a session, close the tab, restore network, reopen on the *same phone*, confirm the flush. Background Sync will not rescue this on Safari.
- Staff running the **consent-withdrawal procedure** out loud on a volunteer.
- Staff reading the Staff View's **failure states** — dropped indicator, stale clock.
- **The fallback tablet used in anger:** network killed, staff hand it over, conversation captured.
- The pre-open checklist, **timed**. If it takes 25 minutes nobody will run it daily.

**Stage 2 — on-site smoke test, build day.** Only what the hall can prove: real NFC taps in the booth's final position; cold load on the actual hall network; pixel-art legibility under convention lighting at arm's length; one end-to-end session landing a real lead, then delete that test lead.

### Device matrix — four, plus two

| Device | Proves |
| --- | --- |
| Current iPhone (Safari) | Happy path; the no-Background-Sync queue path |
| **Older iPhone** | Service worker and `sendBeacon` support limits |
| Current Android (Chrome) | Happy path; Background Sync draining a closed tab |
| **Budget Android** | Pixel-art scaling, low-density screens, slow CPU, Silkscreen legibility |

Plus the **dirty test phone** (old service worker, never cleared) and the **fallback tablet**.

### Service-worker staleness rehearsal

Run by the **release owner personally**, because they are who will need it at 11pm:

1. Load the current build on the dirty phone. Never clear it.
2. Deploy a trivially visible change.
3. Reopen on the dirty phone; confirm the new build is served **without clearing data**.
4. If not: the precache manifest is not keyed to the build id, or `skipWaiting`/`clients.claim` are missing — a build bug found a week early rather than mid-event.

### Load — none warranted

~2,000 sessions over three days at ~8 floor hours a day is **~1.4 sessions/minute average**, or **~0.23 writes/second** at a 10× peak, plus one beacon per tap. Supabase absorbs that with orders of magnitude to spare, and the single terminal POST means one write per completed session.

**No load testing or capacity work.** The genuine risks are the hall network (mitigated by the offline design, not by capacity) and Vercel cold starts on the submit function — worth one measurement at stage 2; a keep-warm ping fixes it if it bites.

### Scheduling consequence

A T-7 rehearsal means the build is **feature-complete a week before the convention**. With the convention under four weeks out, that leaves roughly two weeks of build once this spec lands. Tight but not unreasonable — recorded because the rehearsal date makes it a hard constraint rather than an aspiration.

---

## 17. Roles to fill

The spec ships **role slots**. Nobody needs a name to build this; they need one to run the event.

**RELEASE OWNER** — sole deploy authority during the event; runs the overnight window and the hotfix path; personally runs the service-worker staleness rehearsal; may roll back at any time. *Needs Vercel deploy + rollback.*

**RELEASE OWNER DEPUTY** — the same authority when the release owner is off the floor, asleep or unreachable. A three-day event cannot have a single point of failure on deploys.

**STAFF LEAD** — holds the event PIN; briefs staff including on the Staff View's failure states; owns the on-the-spot consent-withdrawal procedure; runs the daily pre-open checklist.

**DATA OWNER** — generates and forwards nightly packs; actions deletion and withdrawal requests including those forwarded from the DPO mailbox; verifies the 90-day deletion job ran against **both** database and storage. *Needs Supabase read + delete.*

### Pre-event provisioning checklist

- [ ] All four roles have a named person.
- [ ] **Every credential held by at least two people** — Vercel, Supabase, event PIN, NFC tag writer.
- [ ] **Two tablets identified as specific devices:**
  - **Offline fallback tablet** — runs the *visitor app*, cache warmed daily, browsing data never auto-cleared.
  - **Counter monitor tablet** — runs the *Staff View* face-up as the only passive monitoring signal; never sleeps, holds a Wake Lock, left signed in.
  - **These cannot be the same device** — during an outage the fallback is in a visitor's hands, exactly when the monitor matters most.
- [ ] **The data owner is introduced to whoever monitors dataprotectionofficer@uobgroup.com** before the event.
- [ ] A contact channel that reaches the release owner during floor hours.
- [ ] Two or three **sample NFC tags** written for rehearsal; bulk batch as late as practical, **build day is the URL deadline**.

---

## 18. Open items handed on

Deliberately unresolved. None blocks the build.

| Item | Status |
| --- | --- |
| **Real UOB BU names and owner mailboxes** | Not available. The spec ships eight placeholder BUs with empty `ownerEmail` slots, filled as config. |
| **NFC tag hardware** | How many, what type, where they sit on the booth. Hangs on final booth layout. iOS/Android tap behaviour is a rehearsal observation. |
| **Booth staff operating procedure — the human half** | The opening line, how staff hand the experience over, what they do while a visitor plays. Staff duties are accumulating across §7, §12, §14 and §15; a briefing document is forming and should be written. |
| **"Explore Solutions" destination** | The EXPLORATORY ending needs somewhere to send people. Depends on what UOB collateral exists. |
| **Accessibility of pixel type** | Contrast against the art, text scaling, screen readers. Pixel type in a scrolling panel is the least forgiving option available — this became *more* pressing, not less. The build ships Silkscreen at 0.9rem, above the 10.5px this was written against. |
| **Language** | English-only assumed for a Singapore audience, unconfirmed. A second language means a **second full deck** against the same 78-character budget, not a translation pass. |
| **Edge and error states** | Duplicate email, two visitors sharing a phone, back-button mid-tree, resuming an abandoned session. |
| **Per-node drop-off analytics** | Unobservable **by choice** — per-node beacons were considered and declined as capturing no extra leads. Revisit only if a second event wants the curve. |
| **Panel colours** | Derived blends of Resolution Blue; no official UOB panel colour exists. |
| **Life after the convention** | Whether this is reused at a second event. The data question is answered: 90 days, then deletion. |

---

## Appendix — decisions that overrode the brief

Recorded so they are not mistaken for oversights.

| Brief says | Spec does | Why |
| --- | --- | --- |
| §18 "one relevant follow-up" | Uniform four nodes | Scoring needs Need + Timeline + Intent; a two-node tree cannot compute §12 at all |
| §10 "Just Exploring" bypasses qualification | Stays on the spine, softer wording | Catches the self-described browser with an immediate timeline — a 100-point lead otherwise discarded |
| §2 Role and customer status optional | Role required; customer status dropped | Role feeds decision influence; customer status is unverifiable without UOB systems |
| §12 Need = 15 + 10 | Merged to a single 25 | "+15" fired for everyone; "pain point" had no defined input |
| §12 Company fit = "strategic company" | Corporate vs free email domain | No target list exists; this is computable and discriminating |
| §14 four CTAs / three buttons | Four wordings across three actions | Resolves the section's own contradiction |
| §17 footfall as physical traffic | Footfall = NFC taps | The app cannot observe physical traffic |
| §16 staff card order | Band first, score below | A glance needs the category, not the number |
| §15 slashed BU pairs | One primary BU, secondary null | Two owners means a lead is chased twice or not at all |
