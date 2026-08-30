# Make the lead score computable

Type: grilling
Status: resolved
Blocked by: 03

## Question

Turn the brief's section 12 scoring table into a total function from a completed session to a 0–100 score and a band.

The table as written does not compute. Resolve each gap:

- **Role is optional, but Decision Influence is worth up to 15 points.** If role is not given, does the visitor score 0 there, a default, or does the denominator shrink?
- **"Company Fit — strategic / target company, +10"** has no stated rule. How is a target company determined with no CRM lookup and no BU list? Email-domain matching? A manual list? Drop the category?
- **"Engagement — agrees to BU follow-up, +10"** is the final CTA choice, so it lands *after* the visitor has been scored and shown a CTA. Is the score computed twice, or is the CTA screen shown before the score is final?
- **A "Just Exploring" visitor** can never earn Need points, capping them well under 40. Is that the intended behaviour of the EXPLORATORY band, or does a band boundary need to move?
- **Do the maxima actually reach 100?** Verify the table sums correctly and that every band is reachable.

Produce: the exact input-to-points mapping, the missing-data rules, the final band boundaries, and worked examples that land in each of HOT / WARM / QUALIFIED / EXPLORATORY.

## Answer

### The score is computed in two phases

This is forced, not stylistic. §12 scores Engagement from the CTA choice while §14 selects the CTA from the Band, which comes from the score — a closed loop. Breaking it:

```
phase 1  answers          -> provisional score (0-90) -> provisional Band
phase 2  provisional Band -> which CTA is emphasised
         visitor chooses  -> Engagement (0 or 10)
         final score      = provisional + Engagement   (0-100)
         final Band       = band(final score)
```

**The provisional Band only decides CTA presentation. The final Band is what is stored, shown to staff, used for routing and used for handoff.** A lead may move up a band by choosing a specialist, which is correct — agreeing to a follow-up genuinely is a stronger signal.

### Phase 1 — the provisional score

| Category | Input | Points |
| --- | --- | --- |
| **Need** | `need.*` is a concrete option | **25** |
| | `need.just_exploring.nothing_specific` or `need.managing_risk.minimal_fx` | **10** |
| **Timeline** | `.immediate` | 20 |
| | `.1_3_months` | 15 |
| | `.3_6_months` | 10 |
| | `.6_12_months` | 5 |
| | `.no_timeline` | 0 |
| **Intent** | `.actively_looking` | 20 |
| | `.considering` | 10 |
| | `.researching` | 5 |
| **Decision influence** | role = Owner, C-suite or Director | 15 |
| | role = Manager, or finance / treasury function | 10 |
| | role = Executive, analyst or other | 5 |
| **Company fit** | company email on a corporate domain | 10 |
| | company email on a free-mail domain | 0 |

**Provisional maximum: 25 + 20 + 20 + 15 + 10 = 90.** HOT (80+) is reachable before the CTA, so the two-phase scheme does not strand the top band.

**Provisional minimum is 20, not 0** — every visitor answers `need` (≥10), `intent` (≥5) and has a role (≥5). EXPLORATORY still has a live range of 20–39, so the band is reachable; it simply cannot be scored at literal zero. Worth knowing before anyone reads a 0 as a bug.

**Need merges §12's two rows.** "Clear business need +15" and "specific pain point +10" become one 25-point category, because under uniform depth every visitor answers a need node, so +15 fired for everyone and discriminated nothing, and "pain point" had no defined input anywhere in the brief. The 25-point maximum and the 100 total are preserved.

**Company fit is repurposed** from "strategic / target company" — which needs a list that does not exist — to corporate-versus-free email domain. Computable at check-in from the domain already parsed, and genuinely discriminating at a B2B booth. **Accepted cost:** a legitimate small business using a free address loses 10 points. The implementation needs a maintained free-mail domain list (gmail, yahoo, hotmail, outlook, icloud, proton, qq, 163 and the common disposable providers).

**Role always has a value**, because ticket 03 decision 4 made it a required check-in dropdown. The three dropdown options above *are* the three tiers — no title parsing, no NLP, no missing-data rule needed. The first bullet of this ticket is therefore moot. Self-reported seniority is inflatable; accepted as the cost of not asking an awkward question.

### Phase 2 — Engagement, and the CTA screen

Every visitor sees the same three actions. The **provisional Band** decides which is listed first and emphasised, and how the first one is worded:

| Action | HOT wording | WARM wording | QUALIFIED / EXPLORATORY |
| --- | --- | --- | --- |
| **BU follow-up** | "Talk to a Specialist" | "Request a Follow-Up" | present, not emphasised |
| **Send me information** | present | present | emphasised for QUALIFIED |
| **Explore solutions** | present | present | emphasised for EXPLORATORY |

This reconciles §14's contradiction — its table lists **four** CTAs while its "simple final screen" shows **three**. There are four *wordings* across three *actions*: HOT and WARM are the same underlying action, worded to match urgency.

**Engagement = +10 if the visitor picks the BU follow-up action, 0 otherwise.** That is the only choice that means "agrees to BU follow-up" in §12's sense. It is scored on the action, not the wording, so HOT and WARM score identically for the same decision.

### Bands

Unchanged from §13, applied to the **final** score:

| Band | Range |
| --- | --- |
| 🔥 HOT | 80–100 |
| 🟠 WARM | 60–79 |
| 🟡 QUALIFIED | 40–59 |
| ⚪ EXPLORATORY | 0–39 |

### Incomplete sessions — the floor rule ticket 03 decision 6 owed

A session that exits early still reaches `cta` and is still scored, on the answers it has. Unanswered categories score **0**.

**A session that did not answer all four nodes is capped at EXPLORATORY (39), whatever it computes to.** Without the cap, someone who answers only `need` with a senior role and a corporate domain scores 25 + 15 + 10 = 50 and lands in QUALIFIED on a third of a conversation — a lead a BU would chase on almost no evidence. The cap is applied after the final score; the raw score is still stored, so nothing is hidden.

### Worked examples

| # | Session | Need | Time | Intent | Role | Fit | Prov. | Band | CTA | Final |
| --- | --- | --: | --: | --: | --: | --: | --: | --- | --- | --- |
| 1 | CFO, working-capital financing within 2 months *(the brief's own §13 example)* | 25 | 15 | 20 | 15 | 10 | **85** | HOT | Specialist | **95 HOT** |
| 2 | Finance manager, payments reconciliation, 3–6 months, considering | 25 | 10 | 10 | 10 | 10 | **65** | WARM | Send info | **65 WARM** |
| 3 | Analyst, digitalising reporting, 6–12 months, researching | 25 | 5 | 5 | 5 | 10 | **50** | QUALIFIED | Send info | **50 QUALIFIED** |
| 4 | Browser, nothing specific, no timeline, researching, free email | 10 | 0 | 5 | 5 | 0 | **20** | EXPLORATORY | Explore | **20 EXPLORATORY** |
| 5 | **"Just exploring" but urgent** — picks Payments as the curiosity area, immediate, actively looking, Director, corporate | 25 | 20 | 20 | 15 | 10 | **90** | HOT | Specialist | **100 HOT** |

All four bands are reachable, and example 1 lands within a point of the brief's own worked figure of 85.

**Example 5 is the point of ticket 03 decision 3.** This visitor self-described as *just exploring* and would have been routed straight to a low-value ending under the brief's §10 bypass. Keeping them on the uniform spine catches a maximum-score lead the brief would have discarded.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 06 | Store `provisional_score`, `engagement`, `final_score`, `band`, the **per-category breakdown**, and an `incomplete` flag. Staff need to see *why* a lead scored, and the export needs it. |
| 09 | §16 is a worked staff-view mock-up showing score and band together — use it. Show the band, the score and the recommended action. |
| 10 | "Qualified Leads" in §17's funnel should mean band ≥ QUALIFIED (score ≥ 40), and that definition needs stating on the dashboard. |
| 11 | The CTA screen shows three actions with one emphasised, not one — and the emphasis is band-driven. |
| 12 | Export carries the breakdown, not just the total. |
| 13 | Needs four CTA wordings across three actions, per the table above. |
| 05 | Unaffected — routing keys off `(interest, need)`; Timeline and Intent move the Band, never the BU. |
