# Assemble the spec

Type: task
Status: resolved
Blocked by: 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 15, 16, 17, 18

## Question

Compile every resolved ticket into `.scratch/booth-npc-app/spec.md` — the destination of this map.

Not a decision ticket: this is the assembly step. The spec must stand alone for someone who has read none of the tickets, and must cover:

- Purpose, audience and the booth context
- The visitor journey end to end, screen by screen
- The full conversation node graph and the complete dialogue copy
- The scoring function, bands and worked examples
- The BU routing table and the popularity metric
- Data model, storage, and the cloud Excel export
- Offline and submission-durability behaviour
- PDPA consent, retention and deletion
- The live staff view and the organiser dashboard
- The post-event routed export
- Stack, hosting, the NFC URL and dashboard auth
- Open items explicitly handed on: real BU names and owner mailboxes, NFC tag hardware, staff operating procedure

Finish by checking the spec against the map's **Out of scope** list, so nothing ruled out has crept back in.

## Answer

**Assembled at [`.scratch/booth-npc-app/spec.md`](../spec.md)** — 878 lines, ~9,000 words, 18 sections plus an appendix.

Compiled from 17 resolved decision tickets, two prototypes and the source brief. It stands alone: someone who has read none of the tickets can build from it.

### Coverage against this ticket's requirements

| Required | Section |
| --- | --- |
| Purpose, audience, booth context | §1 |
| Visitor journey screen by screen | §4 |
| Full node graph | §5 |
| Complete dialogue copy | §6 |
| Scoring function, bands, worked examples | §8 |
| BU routing table and popularity metric | §9, §13 |
| Data model, storage, cloud Excel export | §10, §14 |
| Offline and submission durability | §11 |
| PDPA consent, retention, deletion | §7 |
| Live staff view and organiser dashboard | §12, §13 |
| Post-event routed export | §14 |
| Stack, hosting, NFC URL, dashboard auth | §3 |
| Open items handed on | §18 |

### Out-of-scope audit — performed, clean

Every item on the map's Out of scope list was grepped against the spec. All mentions fall in the §2 exclusion table or are explicit ruling-out references (e.g. *"a scripted tree beat an LLM"*). **Nothing ruled out has crept back in.** The only other hits — "platform" — are Vercel lock-in and the `too_many_platforms` payments option, both legitimate.

### Two things added that no single ticket owned

- **§18 Open items**, consolidating everything deliberately unresolved, so a builder meets the gaps in one place rather than discovering them.
- **An appendix of decisions that overrode the brief**, nine in all, so a reader comparing spec to brief does not mistake a deliberate departure for an oversight.

The destination is reached. **The map is closed.**
