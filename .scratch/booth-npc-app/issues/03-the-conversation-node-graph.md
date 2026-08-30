# The conversation node graph

Type: grilling
Status: resolved


## Question

What is the canonical node graph of the NPC conversation — every node, every option, every edge, every terminal state?

Turn the brief's sections 3 to 11 from prose into something a build can be wired from. Resolve these along the way:

- **Reconcile two conflicting shapes in the brief.** The journey diagram (section 1) has three entry paths — Explore Solutions / Specific Need / Existing Challenge. Section 3 instead offers seven broad interest options. Which is the real second screen, and where does "Existing Challenge" live?
- **Depth guarantee.** The brief promises "one relevant follow-up". Several branches actually chain three questions (section 7, Financing: type, then planning state, then timing). What is the hard maximum number of nodes a visitor can hit, and is that acceptable at a booth?
- **The "Just Exploring" path (section 10).** It bypasses qualification entirely. Does it still reach the intent question (section 11) and the CTA screen, or exit early?
- **Node identity.** Stable ids for every node and option, so scoring, routing and analytics all reference the same things.
- **Early exit.** Can a visitor bail mid-tree and still land on a CTA? What is kept if they simply close the tab?
- **Optional fields.** Role and existing-customer status are optional at check-in but feed scoring. Are they asked at check-in, asked by the NPC mid-conversation, or dropped?

Deliver the graph in a form the later tickets can consume — a node table plus edges, not prose.

## Comments

### Session 2026-08-30 — partial progress (ticket still claimed, not resolved)

**Blocked on the source brief.** The brief referenced by this ticket ("sections 3 to 11") is **not stored anywhere in this repo**. It exists only in the charting session's chat history. The node table cannot be written faithfully without it. Requested from the user; suggested it be committed to `.scratch/booth-npc-app/brief.md` so the map stops depending on a document that lives nowhere.

**Decisions banked so far:**

1. **The second screen is a single Interest node carrying all seven Interests, in a scrollable choice panel.** Rejected: 3-entry-paths-then-Interest (adds depth for everyone), 4+4 paging (dead node), collapsing to four (contradicts `CONTEXT.md`), custom 7-tile grid (bespoke screen). Chosen because it preserves all seven ratified Interests at zero extra depth without leaving the dialog idiom.
   - **Consequence to carry:** the `Dialog Interface.jpg` choice panel comfortably shows ~4 one-line rows, so three of the seven sit below the fold. Below-fold options are systematically under-picked, which **biases the "most popular BU" statistic** in tickets 05 and 10. Interest option *order* is therefore a scoring/routing decision, not styling. Recommend the dashboard record option rank alongside the pick so the bias is measurable.
   - **Still open:** where "Existing Challenge" (journey diagram, section 1) lives, now that the three entry paths are not the second screen.

**Asset constraints established (from `Game Assets/`):**

- Choice panel: icon + number + one line per row, ~24 chars, ~4 rows visible before scroll.
- Dialog box: ~3 lines at ~28 chars. This is the per-node NPC copy budget that ticket 13 must write to.
- The NPC name plate ("UOB Receptionist") is a CSS overlay — it is absent from the empty `Dialog Interface.jpg`.

2. **Depth is uniform: exactly four nodes on every path** — `interest` → `need` → `timeline` → `intent`, then the CTA screen. Four taps after check-in.
   - **Why:** scoring needs Need, Timeline and Intent as inputs, so a two-node tree (the brief's literal "one relevant follow-up") cannot compute the section 12 model at all. Uniform depth makes the score a **total function** (ticket 04's stated goal), keeps the schema free of ragged "never asked" vs "skipped" nulls (ticket 06), and makes per-node drop-off directly comparable across branches (ticket 10).
   - **Overrides the brief:** the brief's "one relevant follow-up" promise and the ragged Financing chain (type → planning → timing) are both replaced by the uniform four. Financing's three questions must be **compressed into the `need` node** or demoted to a scoring input, not chained.
   - **Open tension:** "Just Exploring" (section 10) is defined as bypassing qualification, but uniform depth asks it the same four questions. Needs resolving — see below.

3. **"Just Exploring" stays on the uniform four-node spine, reworded.** It is not an early exit and not a special case in the graph — its `need`/`timeline`/`intent` nodes carry low-pressure curiosity wording ("what caught your eye?", "a now thing or a someday thing?") while occupying the same node slots as every other path.
   - **Why:** keeps the score a total function with no hardcoded band, keeps per-node drop-off comparable, and — the real payoff — **catches the visitor who self-describes as "just exploring" but answers with a near-term timeline**. The brief's bypass would have thrown that lead away.
   - **Consequence for ticket 13:** the copy deck needs a second register. Every node on the Just Exploring branch needs its own softer wording, so the dialogue copy is not one line per node but one line per node *per register*.

4. **Role is a required dropdown on check-in; company fit is derived; existing-customer status is dropped.**
   - `decision_influence` ← the role dropdown, captured at check-in so the score is complete before the CTA is chosen (the CTA's wording depends on Band, so the Band must exist by then).
   - `company_fit` ← derived from the company email domain at zero friction. No extra question.
   - `existing_customer` ← **dropped**. It cannot be verified without UOB systems, and "UOB InfoSec / production security review" is already out of scope for this standalone app. A self-reported answer would be an unverifiable scoring input. **Ticket 04 must reweight section 12 without it.**
   - The check-in form was being reworked regardless — the reference art is missing both the company field and the consent checkbox (see comments on tickets 07 and 11).

5. **Node and option identity (convention, settled without grilling — it is a naming scheme, not a decision).**
   - Node ids are stable snake_case slugs, never renumbered and never reused: `interest`, `need.<interest>`, `timeline`, `intent`.
   - Because `need` differs per Interest, there are **seven `need` nodes**, one per Interest — `need.growing`, `need.payments`, `need.financing`, and so on.
   - Option ids are `<node_id>.<option_slug>`, e.g. `interest.payments`, `need.payments.cross_border_collections`.
   - **Structural consequence for ticket 05:** the routable terminal state is the **`(interest, need)` pair**, not the full path. Timeline and Intent are scoring inputs, not routing inputs — they change the Band, never the BU. This makes 05's coverage proof finite and small: exactly one BU mapping per `need.*` option, so "prove no path falls through" reduces to "every `need.*` option has a row".

6. **A persistent exit is available on every node and leads to a generic CTA; partial answers are kept.**
   - The exit row is the greyed "I'm just looking around" affordance already shown in `Dialog Example.jpg`, present on every node rather than only the first.
   - A session that exits early is **still scored** on the answers it has, and floors to EXPLORATORY when too thin to band otherwise. **Ticket 04 owes a documented floor rule for partial sessions.**
   - A closed tab keeps whatever already reached the server — the precise durability guarantee is **ticket 08's** to specify, not this one's.
   - **Why:** a visitor who answers three of four questions and leaves is still a real, contactable lead. Discarding that is throwing away signal the booth paid for.

---

## Emerging node table

Complete except the seven `need.*` option lists, which are the only brief-dependent part.
Interest options, Intent options and the three CTA variants are taken from ratified `CONTEXT.md` vocabulary, not invented.

| Node id | Kind | Options (ids) | Next |
| --- | --- | --- | --- |
| `checkin` | form | name, company email, `role`, consent | `interest` |
| `interest` | choice, scrolls | `.growing` `.managing_cash` `.payments` `.financing` `.managing_risk` `.digitalising` `.just_exploring` | `need.<chosen>` |
| `need.growing` | choice | **TBD — brief §3–11** | `timeline` |
| `need.managing_cash` | choice | **TBD — brief §3–11** | `timeline` |
| `need.payments` | choice | **TBD — brief §3–11** | `timeline` |
| `need.financing` | choice | **TBD — brief §7**, compressed from the 3-question chain | `timeline` |
| `need.managing_risk` | choice | **TBD — brief §3–11** | `timeline` |
| `need.digitalising` | choice | **TBD — brief §3–11** | `timeline` |
| `need.just_exploring` | choice | **TBD** — softer register, see decision 3 | `timeline` |
| `timeline` | choice | `.now` `.this_quarter` `.this_year` `.no_timeline` *(proposed buckets — not in `CONTEXT.md`, confirm)* | `intent` |
| `intent` | choice | `.actively_looking` `.considering_options` `.researching` | `cta` |
| `cta` | terminal | wording selected by Band | end |

**Edges.** The spine is linear: `checkin → interest → need.* → timeline → intent → cta`. The only branch in the entire graph is `interest` choosing which of the seven `need.*` nodes is visited. Additionally, a **persistent exit edge runs from every node to `cta`**.

**Terminal states.** `cta` is the single terminal node, presented in three variants (talk to a specialist / send information / explore solutions) chosen by Band. Routing keys off the `(interest, need)` pair — see decision 5.

**What remains to resolve this ticket:** populate the seven `need.*` option lists from brief sections 3–11, and confirm the proposed `timeline` buckets.

### Amendment 2026-08-31 — decision 6 revised by ticket 08

[Offline behaviour and submission durability](08-offline-behaviour-and-submission-durability.md) chose a **single POST at the CTA**, with the cost stated and accepted. Decision 6 above is revised accordingly:

- **Still true.** The persistent exit on every node still leads to the CTA, and the CTA is where the POST fires. A visitor who *deliberately* bails is still captured, still scored on partial answers, and still floors to EXPLORATORY. This part is unchanged — and it matters more now, because the exit is the **only** way a departing visitor's data survives. The exit affordance should be visually prominent, not a grudging grey row.
- **No longer true.** "A closed tab keeps whatever already reached the server" now means **nothing is kept**. Under a single terminal POST no Lead row exists until the CTA, so a visitor who closes the tab or walks away mid-tree leaves no trace at all — not even the check-in contact details they already typed.
- **Knock-on.** The Staff View cannot show a lead mid-conversation, because none exists until completion. Ticket 09 must not assume otherwise.
- **Knock-on.** Footfall can no longer be derived from Lead rows. The separate footfall beacon is now **mandatory**, not optional — see ticket 08's answer.

## Answer

The six decisions banked on 2026-08-30 (as amended by ticket 08) fix the structure; the brief supplies the content. The graph below is the result.

### The spine

```
checkin -> interest -> need.<interest> -> timeline -> intent -> cta
                                                                 ^
              persistent exit from every node ------------------/
```

The **only** branch in the entire graph is `interest` selecting which of the seven `need.*` nodes is visited. Everything else is linear. `cta` is the single terminal node, presented in four band-matched variants.

### Node table

| Node id | Options (id — label) | Next |
| --- | --- | --- |
| `checkin` | Full name, company email, `role` (dropdown), phone (optional), two consent boxes | `interest` |
| `interest` | `.growing` Growing · `.managing_cash` Managing Cash · `.payments` Payments · `.financing` Financing · `.managing_risk` Managing Risk · `.digitalising` Digitalising · `.just_exploring` Just Exploring | `need.<chosen>` |
| `need.growing` | `.local` Growing locally · `.asean` Expanding into ASEAN · `.greater_china` Into Greater China · `.anz` Into Australia / NZ · `.europe` Into Europe · `.us` Into the US · `.other_overseas` Expanding elsewhere | `timeline` |
| `need.managing_cash` | `.visibility` Cash visibility across accounts · `.optimise_excess_cash` Optimising excess cash · `.access_to_funds` Improving access to funds · `.working_capital` Access to working capital | `timeline` |
| `need.payments` | `.too_manual` Too manual · `.too_many_platforms` Too many platforms · `.cross_border` Cross-border payments or collections · `.reconciliation` Reconciliation · `.get_paid_faster` Getting paid faster · `.processing_time_cost` Processing time or cost | `timeline` |
| `need.financing` | `.growth` Financing growth or expansion · `.working_capital` Working capital · `.specific_investment` A specific investment · `.trade` Trade finance | `timeline` |
| `need.managing_risk` | `.fx_exposure` Managing FX exposure · `.fx_rates` Improving FX rates · `.volatility` Managing volatility · `.interest_rate` Interest rate risk · `.minimal_fx` We deal in foreign currency rarely | `timeline` |
| `need.digitalising` | `.payments` Payments · `.collections` Collections · `.reconciliation` Reconciliation · `.cash_management` Cash management · `.reporting` Reporting · `.trade` Trade · `.other` Something else | `timeline` |
| `need.just_exploring` | `.growing` · `.cash` · `.payments` · `.financing` · `.risk` · `.digitalising` · `.nothing_specific` Nothing specific, just looking | `timeline` |
| `timeline` | `.immediate` Immediately / within a month · `.1_3_months` 1–3 months · `.3_6_months` 3–6 months · `.6_12_months` 6–12 months · `.no_timeline` Just exploring | `intent` |
| `intent` | `.actively_looking` Actively looking for a solution · `.considering` Considering options · `.researching` Just researching | `cta` |
| `cta` | Terminal. Four variants selected by Band (§13/§14). | end |

**Maximum depth: 4 taps after check-in, on every path.** Panel rows per node run from 3 to 7; the choice panel scrolls (decision 1).

### Timeline buckets — confirmed, and taken from §12 rather than §4–§9

The proposed buckets are **revised**. The brief uses a *different* timeline scale in almost every branch — §4 offers "Already planning / Within 3 months / 3–12 months", §5 offers "Now / 1–3 / 3–6", §7 offers "Immediately / 1–3 / 3–6 / 6–12. Under uniform depth there is one shared `timeline` node, so one scale must win.

**§12's scoring table is the authority**, because it is the only one of these that has to compute. Its rows are Immediate/<1 month, 1–3 months, 3–6 months, 6–12 months — which is exactly the five-option list above, with "Just exploring" as the zero-point floor. Every other branch's scale collapses onto it without loss.

### How each branch was compressed

Uniform depth allows one `need` node per Interest, so the brief's chains had to fold. Each fold is recorded, because ticket 13 must write copy for the compressed question, not the brief's original.

| §  | Brief's chain | How it folds |
| --- | --- | --- |
| 4 | local-vs-overseas → which market → planning state | Local/overseas and market **merged into one option list**. Planning state → the `intent` node. |
| 5 | visibility/liquidity/working capital → sub-question → timing | The liquidity sub-question ("optimise excess or improve access") is **promoted to the top level** as two of the four options. Timing → `timeline`. |
| 6 | payments/collections/both → challenge → priority | Channel and challenge **merged**; the six options span both. Priority → `timeline`. |
| 7 | type → planning state → timing | **Folds perfectly.** Type stays as `need`, planning state is `intent`, timing is `timeline`. The three-question chain ticket 03 flagged was already our spine. |
| 8 | FX yes/no → concern → frequency | Gate and concern **merged** (`.minimal_fx` absorbs the "no" branch). **Frequency is dropped** — see losses below. |
| 9 | process area → current tooling → actively changing | Process area stays as `need`. "Actively changing" → `intent`. **Current tooling is dropped** — see losses below. |
| 10 | one curiosity question | Becomes `need.just_exploring`, offering the same seven areas in the softer register from decision 3. |

### Two signals the brief scores on that this graph no longer captures

Both are casualties of uniform depth and both were explicit lead-quality discriminators in the brief. Flagging rather than quietly losing them:

1. **FX frequency (§8).** The brief states plainly: *"High-frequency FX exposure + clear pain point = strong lead."* Daily-versus-rarely is gone. Partially mitigated by `.minimal_fx`, which at least identifies the weakest case.
2. **Current tooling (§9).** *"How are you currently managing this?"* — Manually / Excel / Multiple systems / ERP. The brief says this *"distinguishes general curiosity from an active digitalisation project"*. Someone on spreadsheets is a materially better lead than someone already on an integrated ERP, and the graph can no longer tell them apart.

If either matters enough, the cheapest recovery is promoting it into that branch's `need` option labels rather than adding a fifth node and breaking uniformity.

### Findings for ticket 04 — the scoring table does not compute as written

Three of these are structural, not arithmetic, and 04 cannot be resolved without deciding them:

1. **The score is circular.** §12 awards **Engagement +10 for "agrees to BU follow-up"**, which is the CTA choice. But §14 selects the CTA *wording from the Band*, and Band comes from the score. Score → Band → CTA → Engagement → score. **This must be a two-phase computation:** a provisional score (max 90) chooses the CTA, then the visitor's CTA selection adds Engagement to produce the final score. §14 says as much in passing — *"their selection itself becomes a lead-scoring signal"* — without noticing it closes a loop.
2. **"Clear business need identified +15" fires for literally everyone.** Under uniform depth every visitor answers a `need` node, so the +15 is a constant and discriminates nothing. Either it becomes the baseline (and the effective range is 15–100, not 0–100), or "clear need" must be redefined against something narrower — perhaps excluding `.nothing_specific` and `.minimal_fx`.
3. **"Specific pain point identified +10" has no input.** Nothing in the graph distinguishes a "pain point" from a "need"; the brief never defines the difference. Either fold it into the +15, or define which `need.*` options count as pain points.

Also for 04: **Company Fit +10 ("strategic / target company") has no data source.** Ticket 07 derives company fit from the email domain, but there is no target-company list, and the map already rules real UOB BU data out of scope. Likely a constant or dropped.

Arithmetic check: the categories max at 25 + 20 + 20 + 15 + 10 + 10 = **exactly 100**, so the table is at least internally consistent. Band thresholds from §13: HOT 80–100, WARM 60–79, QUALIFIED 40–59, EXPLORATORY 0–39. Note that a maximum provisional score is 90, so HOT is reachable before the CTA — the two-phase scheme works.

### Findings for ticket 05 — routing coverage

The routable terminal is the `(interest, need)` pair (decision 5), so coverage reduces to giving every `need.*` option a row. Against §15, two holes:

- **`need.just_exploring.nothing_specific` maps to no BU.** §15 has no row for it, and by construction the visitor named no area. This is the one genuine fall-through and ticket 05 must decide it — a default BU, or a null routing that goes to nobody and lands only in the export.
- **§15 has an orphan row:** *Acquisition / M&A → Corporate / Investment Banking*. No path in this graph reaches it, because no Interest or `need` option mentions M&A. Either an Interest is missing or the row is dead.

`need.managing_risk.minimal_fx` also routes weakly — the visitor has said they barely use FX, so Markets/Treasury is a poor fit despite the Interest.

### Findings for other tickets

- **Ticket 11 / CONTEXT.md conflict.** `CONTEXT.md` ratifies **three** CTA variants; §13/§14 define **four**, one per Band (Talk to a Specialist / Request a Follow-Up / Send Me Information / Explore Solutions). §14 then muddies it further by sketching a "simple final screen" with only three. **Four is correct** — there are four Bands and each needs its own wording. `CONTEXT.md`'s CTA entry should be updated to four.
- **Ticket 13** writes copy for the *compressed* questions in the table above, not the brief's originals, and needs a second softer register for the whole `need.just_exploring` branch (decision 3).
- **Ticket 09** gets a free gift: **§16 is a fully worked staff-view mock-up** — visitor, interest, need, timeline, intent, score, recommended action — which nobody had seen because the section was never quoted.
- **Ticket 10** likewise: §17 carries the full funnel with worked example numbers (2,000 footfall → 1,250 engaged → 900 contactable → 400 qualified → 180 handoffs).
- **Ticket 06** stores `interest`, `need`, `timeline`, `intent` as four option-id columns plus the two-phase score fields.

### Answers to the ticket's remaining bullets

- **Node identity** — settled in decision 5; ids above are canonical.
- **Early exit** — settled in decision 6 as amended by ticket 08: the persistent exit reaches `cta`, a closed tab keeps nothing.
- **Optional fields** — settled in decision 4: role required at check-in, existing-customer dropped. Note this **contradicts §2**, which lists both as optional; the brief loses, because ticket 04 needs decision influence and existing-customer status is unverifiable.

### Correction 2026-08-31 — `checkin` node field list

The node table's `checkin` row reads "Full name, company email, `role` (dropdown), phone (optional), two consent boxes". It is missing **Company Name**, which brief §2 and `CONTEXT.md` both require and §16's staff view displays. Inherited from ticket 07's enumeration; corrected by ticket 06.

Correct: **Full Name, Company Name, Company Email, Role, Phone (optional), two consent boxes.**

### Label corrections from ticket 13, 2026-08-31

The node table's option labels were placeholders written during charting. [Full NPC dialogue copy](13-full-npc-dialogue-copy.md) supersedes them — see that ticket for the complete set. Three changes are worth recording here because they alter the graph rather than just its wording:

1. **The exit is renamed `Skip to the end`.** The old label, "I'm just looking around", sat directly below the Interest option **Just Exploring** on the same panel and read almost identically — but one continues the conversation and the other ends it. A visitor wanting to browse had a coin-flip between two very different outcomes. This was a genuine graph-level defect, not a copy preference.
2. `need.payments.processing_time_cost` label shortened to **Cost or speed** (was 23 chars, over the 22 limit).
3. `timeline.immediate` label shortened to **Now / under a month**.

The option **ids** are unchanged — only the labels move, so scoring, routing and analytics are unaffected.
