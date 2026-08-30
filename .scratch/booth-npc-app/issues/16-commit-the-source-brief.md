# Commit the source brief to the repo

Type: task
Status: resolved

## Question

Get the original brief into the repo at `.scratch/booth-npc-app/brief.md`.

Not a decision — nothing here to grill, prototype or research. The work is supplying a document that currently exists nowhere in version control.

**Why this blocks the map.** The map's Notes call the brief "the input document" and four tickets quote it by section number:

- Ticket 03 — "the brief's sections 3 to 11" (the conversation nodes)
- Ticket 04 — "the brief's section 12 scoring table"
- Ticket 05 — "the brief's section 15 table" (needs → BUs)
- Ticket 10 — "the brief's section 17" (the funnel stages)

None of those sections is reproduced anywhere in the repo. Ticket 03 got as far as a complete structural graph and then stopped at the seven `need.*` option lists, which cannot be written without sections 3–11. Ticket 04's and 05's core tables have the same dependency.

Reconstructing the sections from memory or invention is **not acceptable** — the node graph feeds scoring, routing, the export and the dialogue copy, so a fabricated graph would propagate through most of the map.

**Done when** `.scratch/booth-npc-app/brief.md` exists with at least sections 1, 3–12, 15 and 17, section numbering preserved so existing ticket references still resolve.

## Comments

Surfaced by the ticket 03 session, 2026-08-30, on discovering the brief was absent from the tree.

### Search performed 2026-08-31 — not found on this machine

Asked to unblock this ticket, I searched for the brief rather than asking again. It is not on disk:

- Downloads, Documents, Desktop and OneDrive scanned by filename for md, txt, docx, pdf, doc and rtf.
- Content-searched for the brief's distinctive phrases — "section 12", "section 15", "section 17", "scoring table", "progressive profiling", "Just Exploring", "cross-border collections".
- The only matches outside this repo were three files in the sibling effort below, and all three are its own vocabulary — "Just exploring" as a business-level tier, not this brief's "Just Exploring" Interest. **Not the brief.**

**Conclusion:** the brief was almost certainly pasted into the charting conversation and never saved to a file. It cannot be recovered by searching; it has to come from the user or from that chat history.

### Related effort found next door — NOT the brief, but worth knowing

`Downloads/SFF 2D Web Game/.scratch/uob-booth-game/` is a separate wayfinder map covering the same UOB booth problem. It is **a different design** — a 4-room free-roam game with avatar creation from contact fields, not this map's scripted dialogue tree — so its decisions do not transfer wholesale. It contains no brief either.

Two of its resolved tickets do carry facts this map currently lacks, recorded as comments on tickets 11 and 17. Its existence also raises a question for the user: whether these two efforts are meant to converge, or whether one supersedes the other.

## Answer

**Done.** The user supplied the brief at `.scratch/booth-npc-app/brief.md` on 2026-08-31.

Coverage check against this ticket's requirement (sections 1, 3–12, 15, 17): **all present, and more** — the file carries sections 1 through 18 with the original numbering intact, so every existing second-hand reference in tickets 03, 04, 05 and 10 resolves correctly.

Notable: the brief also contains **sections 13, 14, 16 and 18**, which no ticket had referenced because nobody could see them. Section 13 (band thresholds), section 14 (CTA-per-band) and section 16 (the staff view mock-up) are directly load-bearing for tickets 04, 09 and 13.

Unblocks ticket 03, and transitively 04, 05, 06, 09, 10, 11, 12 and 13.
