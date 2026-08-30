# BU routing table and function

Type: grilling
Status: resolved
Blocked by: 03

## Question

Map every terminal state of the conversation node graph to a BU, and define what "most popular BU" means.

- **Total coverage.** Every path through the tree must land on a BU. The brief's section 15 table maps *needs* to BUs, but the tree produces paths, not needs — build the mapping from path to BU and prove no path falls through.
- **Primary vs secondary.** Some paths implicate two BUs (cross-border collections points at both Transaction Banking and Cash Management). Does a lead get one BU or a ranked pair?
- **Placeholder discipline.** The real UOB BU list is not ready. Use the brief's generic names, but structure the table so real names and owner mailboxes drop in as a config change, not a redesign.
- **The popularity metric.** The headline objective is "find the most popular BU". Is that counted at the section 3 interest selection (broad — every visitor has one) or at the final routed BU (narrower — qualified visitors only)? These give different answers; pick one as the headline and say why.
- **"Just Exploring" leads** may have no BU at all. Do they count as "Other", or are they excluded from the popularity split?

### Constraint from the artwork, noticed 2026-08-31

**The background art already names three BUs, and every visitor will be looking at them for the whole conversation.**

`Game Assets/Background Screen.jpg` and `Dialog Example.jpg` paint three signboards behind the NPC — **Priority Banking**, **Wealth Management**, **Business Banking** — plus a poster reading *apply & get rewards*. These are baked into a fixed asset and cannot be edited.

A sibling effort's booth config (`Downloads/SFF 2D Web Game/config/content.json`, a separate effort kept deliberately apart) independently lists its booth entities as **Personal Banking, Wealth Management, Business Banking, Apply & Get Rewards** — near-identical, which suggests these reflect the real booth's sections rather than either team's invention. Note *Priority* in our art versus *Personal* in their config; one of the two is wrong and it is worth knowing which before anything is printed.

**Why this constrains this ticket.** The brief's BU list is treated as placeholders, and real BU owner mailboxes are out of scope. But the BU *names* are not fully free: a routing taxonomy that contradicts the three signboards will read as broken to a visitor who is staring at those boards while the NPC talks. Either the routing BUs align with what the art shows, or the mismatch is a deliberate, recorded choice.

Not resolved here — this ticket is still blocked on ticket 03. Recorded so the routing table is not designed in ignorance of the art.

## Answer

### The canonical BU list

§15's slashed pairs are loose shorthand, not a considered primary/secondary, so they collapse to eight canonical BUs. These are **placeholders** — real UOB names and owner mailboxes drop in as config.

| BU id | Placeholder label | From §15 |
| --- | --- | --- |
| `business_banking` | Business Banking | Business expansion; working capital |
| `cash_management` | Cash Management | Cash visibility |
| `transaction_banking` | Transaction Banking | Payments; collections |
| `trade_finance` | Trade Finance | Trade |
| `markets_treasury` | Markets & Treasury | FX; interest rate risk |
| `digital` | Digital | Digital payments; process automation |
| `corporate_investment` | Corporate & Investment Banking | Acquisition / M&A |
| `other_unrouted` | Other / Unrouted | *(new — see fall-through below)* |

### The routing function

Routing keys off the `need.*` option id alone. Because the `need` node is itself selected by the Interest, the `(interest, need)` pair is fully determined by the need option — so the function is a flat 40-row lookup, not a path walk.

```
route(need_option_id) -> { primary_bu, secondary_bu }
```

| Need option | Primary BU |
| --- | --- |
| `need.growing.local` · `.asean` · `.greater_china` · `.anz` · `.europe` · `.us` · `.other_overseas` | `business_banking` |
| `need.managing_cash.visibility` · `.optimise_excess_cash` · `.access_to_funds` | `cash_management` |
| `need.managing_cash.working_capital` | `business_banking` |
| `need.payments.too_manual` · `.too_many_platforms` · `.cross_border` · `.reconciliation` · `.get_paid_faster` · `.processing_time_cost` | `transaction_banking` |
| `need.financing.growth` · `.working_capital` | `business_banking` |
| `need.financing.specific_investment` | `corporate_investment` |
| `need.financing.trade` | `trade_finance` |
| `need.managing_risk.fx_exposure` · `.fx_rates` · `.volatility` · `.interest_rate` | `markets_treasury` |
| `need.managing_risk.minimal_fx` | `other_unrouted` |
| `need.digitalising.payments` · `.collections` · `.reconciliation` · `.cash_management` · `.reporting` · `.trade` · `.other` | `digital` |
| `need.just_exploring.growing` | `business_banking` |
| `need.just_exploring.cash` | `cash_management` |
| `need.just_exploring.payments` | `transaction_banking` |
| `need.just_exploring.financing` | `business_banking` |
| `need.just_exploring.risk` | `markets_treasury` |
| `need.just_exploring.digitalising` | `digital` |
| `need.just_exploring.nothing_specific` | `other_unrouted` |

**Coverage proof.** The graph defines exactly 40 need options — 7 growing, 4 managing cash, 6 payments, 4 financing, 5 managing risk, 7 digitalising, 7 just exploring. Every one appears above exactly once. The function is **total**, and coverage is verifiable by a test asserting that the routing config's key set equals the node graph's need-option set. That test should exist, because the tree may change up to the event.

**The market choice does not affect routing.** All seven `need.growing` options route to the same BU; ASEAN versus US is context for the BU owner, carried on the lead record, not a routing input.

### Two decisions inside the table

**§15's orphan row now has a home.** *Acquisition / M&A → Corporate / Investment Banking* was unreachable, because nothing in the graph mentions M&A. `need.financing.specific_investment` is mapped to it, since "a specific investment" is the closest thing the graph offers to a fundable transaction. This is a judgement call, not a certainty — the alternative is routing it to `business_banking` with the rest of financing and deleting the row as dead. Recorded so it can be reversed cheaply.

**The fall-through is handled by a real BU, not a null.** `need.just_exploring.nothing_specific` and `need.managing_risk.minimal_fx` both route to `other_unrouted`. These are exactly the two options ticket 04 scores at 10 rather than 25 — the graph's two declared non-needs — so scoring and routing agree on which visitors said nothing actionable.

`other_unrouted` has **no owner mailbox and is excluded from the post-event routed export** (ticket 12). These leads still exist, are still contactable, and still appear in the dashboard's "Other" row, but nobody is asked to chase them. This is the honest handling: the brief's §17 funnel already carries an "Other" row at 5%, so the concept is the brief's own.

### Secondary BUs — the column exists, empty

`secondary_bu` is on the schema and null everywhere. Four mappings have an obvious secondary if it is ever switched on; recorded now so the work is not redone:

| Need option | Natural secondary |
| --- | --- |
| `need.payments.cross_border` · `.get_paid_faster` | `cash_management` (the brief's own worked example pairs these) |
| `need.digitalising.cash_management` | `cash_management` |
| `need.digitalising.trade` | `trade_finance` |
| `need.managing_cash.working_capital` | `cash_management` |

Kept null for now because one lead with two owners is chased twice or not at all, and the export (ticket 12) needs an unambiguous routing key.

### Placeholder discipline — the config shape

Real names and mailboxes are a config change, never a redesign:

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

The lead record stores the **BU id**, never the label, so renaming a BU does not rewrite history.

### The popularity metric

**Headline: the Interest distribution, over every session that reached the `interest` node.**

- Every visitor picks an Interest, so it has the largest denominator and no survivorship bias.
- It matches §17's own funnel table, which is titled *BU Interest* and whose rows — Financing, Payments, Cash Management, Digital, FX/Treasury, Other — are Interests rather than BUs. The brief already counts this way.
- The "Other" row absorbs `just_exploring`.

**Second view: routed BU**, over leads that reached a concrete need. Narrower and survivorship-biased, but it is what a BU head actually wants — real demand rather than curiosity.

**A caveat the dashboard must carry.** Ticket 03 decision 1 put all seven Interests in a scrolling panel, so three sit below the fold and will be systematically under-picked. The headline popularity figure is therefore **biased by option order**. Ticket 10 should record the rank of the chosen option alongside the choice, so the bias is measurable rather than invisible.

### The artwork mismatch — assessed, and it is smaller than it looked

The signboards read Priority Banking / Wealth Management / Business Banking, which are retail and wealth propositions, while §15's BUs are corporate and institutional. Only Business Banking overlaps.

**This is not a naming leak.** Both `CONTEXT.md` and §15 are explicit that the visitor never sees a BU name, so no routing decision is ever shown to them and no mismatch is visible in the routing itself.

What remains is a **tone mismatch**: a visitor looking at wealth-management signage while being asked about cross-border collections. That is a copy and art-direction problem, not a routing one, and it belongs to tickets 11 and 13. Flagged there rather than resolved here — no routing decision changes because of it.

The *Priority* versus *Personal* Banking discrepancy between our artwork and the sibling effort's config is likewise not a routing issue, since neither name appears in this table.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 06 | Lead record stores `primary_bu` (BU id, not label) and a null `secondary_bu`. |
| 09 | Staff View shows the BU label and the recommended action, per §16's mock-up. |
| 10 | Headline is the Interest split; routed BU is the second view. Must record option rank to expose the below-fold bias. |
| 12 | Export routes on `primary_bu`. `other_unrouted` leads are **excluded** — no owner, nobody chasing. |
| 11 / 13 | Own the retail-signage-versus-corporate-questions tone mismatch. |
| 14 | Spec carries the canonical BU list, the 40-row table and the config shape. |

### Correction 2026-08-31 — the popularity denominator

This answer specifies the headline Interest split as counted "over every session that reached the `interest` node". **That is not observable.** Ticket 10 corrected it.

The engagement beacon records only *that* the node was reached, not which option was chosen — the choice travels with the single terminal POST (ticket 08), so an Interest picked by someone who then abandoned is never transmitted at all.

**The Interest split is counted over `leads`.** The reasoning here is unaffected: Interest remains the broader denominator, since it covers every Lead while the routed-BU view excludes `other_unrouted`. It is leads-wide rather than sessions-wide.
