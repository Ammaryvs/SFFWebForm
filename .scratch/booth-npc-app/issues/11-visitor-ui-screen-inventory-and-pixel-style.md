# Visitor UI: screen inventory and pixel style

Type: prototype
Status: resolved
Blocked by: 03

## Question

How is every visitor-facing screen composed from the four fixed assets?

Prototype it (`/prototype`) at a real phone viewport, then react to it.

- **Screen inventory.** Every screen from tap to CTA: splash and load, check-in form, each conversation node, the results/CTA screen, and any error or offline state.
- **Reusing the frame.** `Dialog Interface.jpg` is one fixed-size frame. How many characters of copy fit before it overflows, and what happens on a small phone versus a large one? This number is a hard input to the dialogue-copy ticket.
- **Composition.** The background is a tall portrait image with the NPC at a fixed position. How does it scale across phone aspect ratios without cropping the NPC or the dialog box?
- **Typography.** The assets use a pixel typeface. Which font is it, and is it licensed for this use? What is the fallback if not?
- **The choice list.** `Dialog Example.jpg` shows four numbered options with icons. Do the seven interest options from section 3 fit that panel, or does it need to scroll or paginate?
- **Orientation and chrome.** Portrait-only? Behaviour in mobile Safari with its collapsing toolbars? Tap-target sizes.
- **The results screen.** The one screen with no asset reference at all — how does a score band and CTA render in the same idiom?

## Comments

### Noted from ticket 03 session, 2026-08-30

**Check-in field mismatch.** `Game Assets/Contact Detail Form.jpg` shows Full Name / Email Address / Phone Number / Address, with no company field and no consent checkbox. `CONTEXT.md` requires name, company, company email and consent. The prototype must reconcile these — the field list is a real decision (see ticket 07), not a styling detail.

**Panel budgets measured from the assets** (reuse these rather than re-deriving):

- Choice panel: ~4 one-line rows visible, ~24 chars per row, icon + number per row. **Ticket 03 has since decided the panel scrolls** to carry all seven Interests, so the prototype must show scroll affordance — three Interests start below the fold.
- Dialog box: ~3 lines at ~28 chars.
- The NPC name plate is a CSS overlay; it is not baked into `Dialog Interface.jpg`.

### UOB brand palette located, 2026-08-31 — from a sibling effort, needs confirming

This ticket has no colour or type guidance. A separate effort at `Downloads/SFF 2D Web Game/.scratch/uob-booth-game/issues/07-uob-brand-palette-guidelines.md` resolved exactly that, with values it records as **confirmed by the user**:

| Role | Value |
| --- | --- |
| White | #FFFFFF |
| Azure Radiance (primary) | #005EB8 |
| Resolution Blue (primary) | #00237B |
| Light brown (grounded & humble) | #C8BFB4 |
| Grey (modern, neutral/secondary) | #B5AEAA |

**Typography:** Noto Sans, Open Sans. Brand assets are said to live in a folder named "uob assets", exact path unconfirmed.

**Treat as a strong lead, not a settled input to this map** — it was confirmed for a different effort. Two caveats specific to this build:

- The four fixed assets already bake in their own blues. The palette must be checked *against the artwork* rather than applied over it, or the CSS chrome will clash with the JPGs.
- That effort noted its dark panel tones were **derived blends**, not official brand values, because no panel background colour was ever given. The same gap applies here: the dialog and choice panels are dark, and nothing official covers them.

Still open there and still open here: whether "visionary/big-picture" has its own accent, and logo usage rules.

### Tone mismatch handed over from ticket 05, 2026-08-31

The background art's signboards read **Priority Banking / Wealth Management / Business Banking** — retail and wealth propositions. The conversation asks about cross-border collections, FX exposure and working capital, and §15's BUs are corporate and institutional. Only Business Banking overlaps.

This is **not** a naming leak: both `CONTEXT.md` and §15 are explicit that the visitor never sees a BU name, so routing is invisible to them. What remains is a tone mismatch — a visitor reading wealth-management signage while being asked about treasury operations.

Ticket 05 assessed it and changed no routing decision. It lands here (and on ticket 13 for copy) as an art-direction question: whether the composition can de-emphasise the signboards, or whether the NPC's opening copy should set a business-banking frame early enough that the signage reads as background rather than as a menu.

### Prototype built 2026-08-31 — awaiting reaction

**Asset:** [`prototypes/visitor-ui-prototype.html`](../prototypes/visitor-ui-prototype.html) — open directly in a browser, no build step. Throwaway.

Three **structurally different** compositions, not restyles, switchable with `←`/`→` or `?variant=`:

| Variant | Composition | Trade |
| --- | --- | --- |
| **A — Overlay (faithful)** | Background `cover`, dialog frame overlaid at the bottom exactly as `Dialog Example.jpg` shows | Truest to the reference; the NPC crops on short screens and the chrome eats the art |
| **B — Letterbox stage** | Background `contain` in a fixed-aspect stage on top, dialog and choices stacked **below**, never overlapping | NPC never crops and text is always legible; loses the immersive JRPG overlay entirely |
| **C — Adaptive bottom sheet** | Background as backdrop, chrome in a height-capped sheet that scrolls internally | Most robust across aspect ratios and the NPC stays visible; least faithful to the frame |

Also switchable: all **8 screens** (`?screen=`), **5 devices** including the ticket 15 fallback tablet (`?device=`), and **4 typefaces** (`?font=`).

**Press `M` for the measurement overlay.** Rather than guessing the character budget, the prototype measures it live and reports chars/line × lines for the current font and device, flags dialog overflow, counts how many choice rows sit below the fold, and flags rows under the 44px tap-target minimum. **I have not run it in a browser, so I am deliberately not quoting numbers I have not observed** — the tool produces them.

#### Finding that changes the map's Notes

**Only one of the four assets is usable as an image.** The prototype displays `Background Screen.jpg` and nothing else.

- `Dialog Interface.jpg` and `Dialog Example.jpg` are **references to reproduce in CSS**, not assets to render. A JPG frame cannot hold variable-length text — it would either stretch per node or need nine-slicing, and the copy budget changes per node anyway.
- `Contact Detail Form.jpg` is likewise a reference; its real field list is wrong (ticket 06 restored Company Name) and it has no consent checkboxes.

The map's Notes describe `Dialog Interface.jpg` as the "base layer, empty dialog frame + choice panel, **reused on every node**". That is not achievable as an image. The art budget is really **one background image plus a CSS reproduction of the frame** — which is good news for the offline budget (ticket 08's ≤1.2 MB), since three of the four JPGs need never be downloaded.

#### Typography — the licensing question answered

All three pixel candidates wired into the prototype are **SIL Open Font License**, so licensing is not a blocker:

- **Silkscreen** (OFL) — narrow, closest to the artwork's proportions, currently the default.
- **Press Start 2P** (OFL) — iconic but very wide; expect it to roughly halve the character budget.
- **System monospace** — no webfont, zero network cost, least characterful.
- **Noto Sans** — the UOB brand face from the sibling effort. Not a pixel font; included so the clash is visible rather than theoretical.

The exact typeface in the JPGs is unidentified and probably not licensable; one of the above is the fallback the ticket asked for.

#### What I need reacted to

1. Which variant, or which parts of which — the useful answer is usually "B's stage with C's sheet".
2. Font choice, once the measured budget is visible. **This is the hard input to ticket 13.**
3. Whether the tone mismatch is visible in practice: variant A crops the signboards heavily at `object-position: 50% 22%`, B shows them in full. That is the cheapest lever on the ticket 05 concern.

## Answer

**Composition: Variant A — Overlay, on every screen. Typeface: Press Start 2P.**

Prototype: [`prototypes/visitor-ui-prototype.html`](../prototypes/visitor-ui-prototype.html) · published review tool: https://claude.ai/code/artifact/c618ed11-e261-4842-a6b5-b4a9e0d2a767

### The composition

The background image fills the viewport with `object-fit: cover` at `object-position: 50% 22%`, keeping the receptionist centred and visible. All chrome — name plate, dialogue box, choice panel, check-in form, CTA card — is **overlaid at the bottom** over a dark upward gradient, exactly as `Dialog Example.jpg` composes it. One composition for all eight screens; nothing switches layout mid-conversation.

This is the most faithful of the three and the most fragile. What it costs is recorded below rather than discovered later.

### Screen inventory

| # | Screen | Composition |
| --- | --- | --- |
| 1 | Splash / cold load | Background at 72% dark overlay, centred spinner and wordmark |
| 2 | Check-in | Form card overlaid bottom; 5 fields, 2 consent boxes, notice block |
| 3 | Interest | Dialogue + scrolling choice panel, 7 options + exit |
| 4 | Need | Dialogue + choice panel, 3–7 options by branch + exit |
| 5 | Timeline | Dialogue + choice panel, 5 options + exit |
| 6 | Intent | Dialogue + choice panel, 3 options + exit |
| 7 | CTA / result | Card with three actions, band-matched one emphasised |
| 8 | Offline / queued | Background at 72% dark overlay, honest confirmation, no error |

The persistent exit row appears on screens 3–6. Ticket 08 made it the only route by which a departing visitor is captured, so it renders in the panel on every node rather than only the first.

### The copy budget — the hard input to ticket 13

Press Start 2P is a fixed-advance face at **1.0em per character**, which makes the budget exact arithmetic rather than an estimate. Derived from the font metric and the prototype's box widths — **confirm with the Measurements toggle before writing all the copy**:

**Dialogue box**, at 11.5px on the narrowest supported phone (360px):

```
360 device − 20 overlay padding − 6 border − 24 box padding = 310px inner
310 ÷ 11.5px per char           ≈ 26 characters per line
3 lines (the artwork's own depth) → ≈ 78 characters per node
```

On a 390px phone this rises to ~29 chars × 3 ≈ 87. **Ticket 13 must write to the 360px figure: 3 lines × 26 characters ≈ 78 characters per node.**

For scale, the prototype's own opening line — *"Welcome to UOB! What's most relevant to your business at the moment?"* — is 68 characters. It fits, with ten characters to spare. That is the room available.

**Choice option labels**, at 10.5px:

```
310 inner − 20 padding − 18 icon − 20 number − 16 gaps ≈ 236px
236 ÷ 10.5px per char           ≈ 22 characters per label
```

**Two labels already in the ticket 03 graph exceed this and must be shortened:**

| Current | Chars | Suggested |
| --- | --: | --- |
| `Processing time or cost` | 23 | `Cost or speed` |
| `I'm just looking around` | 23 | `Just looking` |

Every other label in the graph fits, though `Immediately / <1 month` lands on exactly 22 and has no slack — worth shortening to `Now / under a month` for safety.

### Consequences the choice carries

- **Variant A crops the signboards.** At `50% 22%` the Priority Banking and Wealth Management boards are pushed largely out of frame. This substantially reduces the tone mismatch ticket 05 handed over — the retail signage is no longer a prominent read while the NPC asks about treasury. The mismatch is mitigated by composition rather than needing copy to work around it. **Ticket 13 is relieved of that burden.**
- **A is the tightest pairing available.** The overlay constrains vertical space most and Press Start 2P is the widest face offered. If copy proves unwritable at 78 characters, the levers in order of preference are: drop the dialogue box to 10.5px (buys ~3 chars/line), allow a 4th line, or switch to Silkscreen (roughly doubles the budget). Changing the composition should be the last resort, not the first.
- **The choice panel scrolls** on the Interest node — 7 options plus exit against roughly 4 visible rows. Scroll affordance is required, and the below-the-fold bias remains a live caveat on the interest split (tickets 05 and 10).
- **Only one asset ships as an image.** `Background Screen.jpg` is rendered; the dialogue frame, choice panel and contact form are CSS reproductions. This corrects the map's Notes and helps ticket 08's ≤1.2 MB budget — three of the four JPGs never need downloading. The background should still be re-encoded to WebP.

### Typography

**Press Start 2P**, SIL Open Font License — licensing is not a blocker, which was one of the ticket's open questions. Loaded from Google Fonts with a `ui-monospace, monospace` fallback stack; the fallback is not metrically identical, so the budget above assumes the webfont loaded. Since ticket 08 precaches with a service worker, the face should be **precached alongside the background image** rather than fetched at runtime, or the first frame renders in the wrong metrics.

The typeface in the original artwork remains unidentified and is presumed unlicensable. Press Start 2P is the sanctioned stand-in.

### Left open, deliberately

- **Panel colours are derived, not brand.** The dark dialogue and choice panels use blends of Resolution Blue; no official UOB panel colour exists. Same gap the sibling effort recorded.
- **Accessibility** of pixel type at this size — contrast, scaling, screen readers — remains fog on the map and is now more pressing, since Press Start 2P at 10.5px is the least forgiving option on the table.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 13 | **Budget: 3 × 26 ≈ 78 chars per node; option labels ≤ 22 chars.** Two labels need shortening. Relieved of working around the signage clash. |
| 03 | Three option labels exceed or exactly meet the limit; shortened forms suggested above. |
| 08 | Precache the Press Start 2P webfont with the background; re-encode the background to WebP. |
| 05 | Tone mismatch mitigated by composition — the crop removes most of the signage. |
| 18 | Rehearsal must check legibility of Press Start 2P at 10.5px on the budget Android under hall lighting. |

---

### 2026-08-31 — typeface changed to Silkscreen during build

**Decision (user):** the visitor app ships **Silkscreen** (SIL Open Font
License), not Press Start 2P.

This is the lever this ticket already recorded at the end of its Variant A
reasoning — *"switch to Silkscreen (roughly doubles the budget)"* — taken
up front rather than as a rescue. It is also what the prototype defaulted
to; Press Start 2P was the option the prototype itself labelled "very
wide".

**What changes:**

- `public/fonts/silkscreen.woff2`, latin subset, regular only. 8.4 KB
  against Press Start 2P's 12.5 KB. No bold cut: nothing in the visitor UI
  sets a pixel bold, and a second face is dead weight in the precache.
- Pixel sizes rise about 25% (`--pix-sm` 0.7rem → 0.9rem). Silkscreen's
  glyphs are smaller within the em, so matching the apparent size needs
  more px — which also buys back some of the legibility this ticket flags
  as fog.
- Option and exit markers changed from `▸` / `⏭` / `▼` to ASCII `>` and
  `>>`. Silkscreen is a 5×7 face with limited coverage; a glyph it lacks
  falls back to the system font and renders as non-pixel type mid-row.

**What this costs, stated plainly:**

The 78 / 22 character budgets were **exact arithmetic** under Press Start
2P, because it is fixed-advance at 1.0em per character. Silkscreen is
proportional, so a character count is no longer an exact bound — an "M" and
an "i" no longer cost the same.

The budgets are kept unchanged and the tests still assert them, but they
are now a **conservative** guard rather than a measurement: this ticket's
own estimate is that Silkscreen roughly doubles the budget, and the 25%
size increase gives back part of that, leaving roughly 120–125 characters
of real room against a shipped deck whose longest line is 51. Nothing in
the deck is at risk; new copy still has generous headroom.

**Owed at rehearsal:** re-measure the true per-line character count on a
real 360px phone. Ticket 18's budget-Android legibility check now reads
"Silkscreen at 0.9rem", not "Press Start 2P at 10.5px".
