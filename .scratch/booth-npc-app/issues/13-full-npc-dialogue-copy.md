# Full NPC dialogue copy

Type: grilling
Status: resolved
Blocked by: 03, 11

## Question

Write the exact wording for every node in the conversation — the script the build assembles.

- **Voice.** The receptionist's character: warm and human, or crisp and efficient? The pixel-JRPG framing invites a little personality; a bank's brand voice may not. Where is the line?
- **Every node.** The NPC line or lines plus the label for every option, for every node in the graph, within the character budget the UI prototype establishes.
- **Check-in and consent screens.** Field labels, placeholders, the consent sentence, validation and error messages.
- **The four CTA endings.** HOT, WARM, QUALIFIED and EXPLORATORY each get different wording (section 14) without revealing to the visitor that they have been scored.
- **Edge copy.** The offline/retry message, submission failure, thank-you and close, and what a returning tapper sees.
- **What the visitor must never see.** BU names, the score, the band, or anything that reads as qualification. Audit the finished script against this.

### Hard copy budget from ticket 11, 2026-08-31

Composition is **Variant A (overlay)** with **Press Start 2P**, a fixed-advance face at 1.0em per character. That makes the budget exact arithmetic rather than a guess. Derived on the narrowest supported phone (360px); confirm with the prototype's Measurements toggle before writing the full deck.

- **NPC line: 3 lines × ~26 characters ≈ 78 characters per node.** For scale, "Welcome to UOB! What's most relevant to your business at the moment?" is 68 characters and fits with ten to spare.
- **Choice option label: ~22 characters.**

**Three labels in the ticket 03 graph need attention** — two exceed the limit, one lands exactly on it with no slack:

| Current | Chars | Suggested |
| --- | --: | --- |
| `Processing time or cost` | 23 | `Cost or speed` |
| `I'm just looking around` | 23 | `Just looking` |
| `Immediately / <1 month` | 22 | `Now / under a month` |

**Two things that make this ticket easier than expected:**

1. **The signage clash is no longer this ticket's problem.** Variant A crops the background at `50% 22%`, pushing the Priority Banking and Wealth Management boards largely out of frame. The copy does not need to work around a retail framing — the composition already removed it.
2. **Every node still needs two registers** (ticket 03 decision 3): the standard wording and the softer "Just Exploring" wording. Both must fit 78 characters.

If the copy proves unwritable at this budget, the levers in order are: drop the dialogue to 10.5px (~+3 chars/line), allow a 4th line, or switch to Silkscreen (roughly doubles it). Changing composition is the last resort.

## Answer

### Voice

**Warm but brief — a real receptionist.** Contractions, plain words, one human beat per line. No jokes, no game-speak, no flourishes. She sounds like someone who is pleased to help and respects your time.

- **She acknowledges every answer** with one short beat before the next question ("Payments it is."). This is what makes it a conversation rather than a four-page form, and it doubles as confirmation that a tap in a scrolling panel registered.
- **She never uses the visitor's name.** It is captured for the lead record and never spoken back — no first-name extraction, so no mangled names in front of a Singapore audience.
- She never mentions a BU, a score, a band, or anything that reads as qualification.

### The budget turned out not to bind

**The longest line in the deck is 51 characters against a budget of 78.** Every NPC line fits with room to spare, and no option label reaches the 22-character limit after the three fixes.

This substantially retires the risk flagged in ticket 11 — that Variant A plus Press Start 2P was the tightest pairing available. It is tight, but the copy this conversation actually needs is short. **None of ticket 11's fallback levers are required.**

### One collision found and fixed

The Interest option **"Just Exploring"** and the persistent exit **"I'm just looking around"** were nearly the same phrase on the same panel, one directly above the other. A visitor wanting to browse the solutions would have had a coin-flip between an option that continues the conversation and one that ends it — and the two lead to completely different outcomes.

**The exit is renamed "Skip to the end"** (15 chars). It is honest about what it does — the exit still reaches the CTA — and cannot be confused with an Interest.

### The deck

#### Check-in

| Element | Copy |
| --- | --- |
| Panel title | `CONTACT INFORMATION` |
| Intro | `Let's start with your details.` |
| Fields | `Full Name` · `Company Name` · `Company Email` · `Role` · `Phone (optional)` |
| Placeholders | `Enter your full name` · `Enter your company` · `you@company.com` · role dropdown · `Optional` |
| Role options | `Owner, C-suite or Director` · `Manager or finance role` · `Executive, analyst or other` |
| Consent 1 | `I agree that UOB may contact me about the solutions we discuss here today.` |
| Consent 2 | `UOB may call or SMS me on this number about those solutions.` |
| Notice | `United Overseas Bank Limited collects your name, company email and role to follow up on this conversation. We keep it for 90 days, then delete it. To withdraw, speak to our booth staff or contact dataprotectionofficer@uobgroup.com.` |
| Buttons | `CANCEL` · `SUBMIT` |

**Validation** — plain, no blame:

- `Please enter your name.`
- `Please enter your company.`
- `That email doesn't look right.`
- `Please tick the box to continue.`

**A free-mail address must never be rejected.** `gmail.com` scores zero on company fit (ticket 04) but is a perfectly valid entry; blocking it would turn a scoring signal into a barrier and lose the lead entirely.

#### Conversation nodes

Character counts are the NPC line; every one is inside 78.

| Node | NPC line | Chars |
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

#### Option labels

All within 22 characters.

| Node | Options |
| --- | --- |
| `interest` | Growing · Managing Cash · Payments · Financing · Managing Risk · Digitalising · Just Exploring |
| `need.growing` | Growing locally · Into ASEAN · Into Greater China · Into Australia / NZ · Into Europe · Into the US · Somewhere else |
| `need.managing_cash` | Seeing cash clearly · Using spare cash · Access to funds · Working capital |
| `need.payments` | Too manual · Too many platforms · Cross-border · Reconciliation · Getting paid faster · **Cost or speed** |
| `need.financing` | Growth or expansion · Working capital · A specific investment · Trade |
| `need.managing_risk` | FX exposure · Better FX rates · Market swings · Interest rates · We barely use FX |
| `need.digitalising` | Payments · Collections · Reconciliation · Cash management · Reporting · Trade · Something else |
| `need.just_exploring` | Growing · Cash flow · Payments · Financing · FX and risk · Going digital · Nothing specific |
| `timeline` | **Now / under a month** · 1-3 months · 3-6 months · 6-12 months · No set timeline |
| `intent` | Actively looking · Considering options · Just researching |
| *exit (every node)* | **Skip to the end** |

Bold entries are the three ticket 11 flagged plus the renamed exit.

#### The CTA endings

**The headline is identical for all four bands** — `Thanks! How can we help from here?` — which is the anti-leak measure. A headline that warmed up for HOT leads and cooled for EXPLORATORY ones would tell the visitor how they had been graded.

Only the first action's wording and the emphasis change:

| Band | First action reads | Emphasised |
| --- | --- | --- |
| 🔥 HOT | `Talk to a Specialist` | action 1 |
| 🟠 WARM | `Request a Follow-Up` | action 1 |
| 🟡 QUALIFIED | `Talk to a Specialist` | action 2 |
| ⚪ EXPLORATORY | `Talk to a Specialist` | action 3 |

Actions 2 and 3 are constant: `Send Me Information` · `Explore Solutions`. All three are always present and always selectable — a HOT lead can still choose to just take a brochure, which is what makes Engagement a real signal rather than a formality (ticket 04).

#### Edge copy

| State | Copy |
| --- | --- |
| Splash | `UOB` / `Loading…` |
| Sent, or queued offline | `Thanks! We'll be in touch soon.` / `You're all set.` |
| Submission failed | *(nothing — ticket 08 made failures silent; the message above is shown either way)* |

**The confirmation is deliberately identical whether the submission landed or queued.** It promises contact, which is true in both cases, and never claims delivery it cannot verify.

#### The returning tapper

**A returning tapper sees the standard flow from the beginning, with no acknowledgement — and this is not an omission.** The footfall beacon carries no personal data (ticket 08), the conversation runs entirely client-side with no lookup, and nothing is transmitted until the CTA (ticket 08). The app therefore *cannot know* it has met someone before until after they have finished. There is no point at which a "welcome back" could be written truthfully, so none is.

### Audit against "what the visitor must never see"

Checked line by line across the whole deck:

- **BU names** — absent. The visitor never sees Transaction Banking, Markets & Treasury or any other routing target. The only bank-side words are UOB itself and "specialist".
- **Score and band** — absent. No number, no temperature word, no ranking language anywhere.
- **Qualification language** — absent. Nothing says qualify, assess, evaluate, rank or score. Questions are phrased as help-finding, not vetting.
- **Credential-shaped asks** — absent, satisfying ticket 01's hard rule. The deck asks only for name, company, company email, role and an optional phone. No password, account number, NRIC, OTP or date of birth appears anywhere, and the receptionist never implies an existing banking relationship.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 03 | Exit renamed **Skip to the end**; three option labels shortened. Node graph labels supersede the placeholders written during charting. |
| 11 | Budget confirmed non-binding — longest line 51 of 78. Ticket 11's fallback levers are not needed. |
| 04 | All three CTA actions remain selectable in every band, which is what keeps Engagement a genuine signal. |
| 06 | Free-mail addresses must be accepted at check-in, never rejected. |
| 09 | Staff-facing copy is out of scope here — the Staff View may use BU names and bands freely, since no visitor sees it. |
| 14 | The spec carries this deck verbatim as the script the build assembles. |
