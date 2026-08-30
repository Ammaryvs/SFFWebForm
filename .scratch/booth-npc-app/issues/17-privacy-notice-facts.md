# Controller, withdrawal contact and privacy notice URL

Type: task
Status: resolved

## Question

Supply three facts that the check-in consent wording has named slots for.

Not a decision — [PDPA consent, retention and deletion](07-pdpa-consent-retention-and-deletion.md) settled the wording and the design; these are values only the organisation can state.

1. **Controller entity.** The exact legal name to print as the party collecting the data — "United Overseas Bank Limited", or a specific UOB entity or business unit running the booth.
2. **Withdrawal contact.** A monitored email address or phone number for someone who wants their data deleted *after* leaving the booth. Ticket 07 chose booth staff as the on-the-spot route, but that covers only visitors still present, and the data is retained for 90 days. A named contact is required for the wording to be valid.
3. **Privacy notice URL.** What the "privacy notice" link on the check-in form points at. UOB's existing public notice is fine if it covers this collection; if it does not, an event-specific notice is needed.

**Also worth a DPO's eye while asking:** ticket 07's design leans on PDPA's business-contact-information carve-out for a B2B audience, and brings Part 9 (DNC Registry) into scope by keeping an optional phone number. Both were specified conservatively — narrow consent, separate channel consent, evidential consent record — but neither was legally reviewed.

**Done when** the three values are recorded here and substituted into the ticket 07 wording.

### Cross-check against a sibling effort, 2026-08-31

`Downloads/SFF 2D Web Game/.scratch/uob-booth-game/issues/01-compliance-consent-requirements.md` resolved the same PDPA question for a different UOB booth design. It agrees with ticket 07 on the essentials — Singapore PDPA only, a separate checkbox for a distinct second purpose, manual rather than self-service deletion, and a legal sanity check before go-live. Three things differ and are worth deciding deliberately rather than by accident:

1. **Retention conflicts. That effort chose 6 months post-event; ticket 07 chose 90 days.** Both are defensible; having two UOB booth apps with different retention periods is not. Someone should pick one. Ticket 07's reasoning was that a booth capture app should not become a shadow CRM — but note the sibling's carve-out, which ticket 07 lacks: *unless the visitor becomes an active lead or customer, in which case normal banking retention governs that relationship instead*. That carve-out is probably right and ticket 07 should likely adopt it.
2. **It hits the same wall this ticket exists for** — its consent wording also ends in a literal *[insert contact]* placeholder. The withdrawal contact is unresolved in both efforts, which makes it a standing organisational gap, not an oversight of this map.
3. **It handles a deletion route ticket 07 does not:** access and correction requests actioned by staff directly from the dashboard's contact list. Worth considering for ticket 09, since ticket 07 currently routes everything through a manual database operation by the data owner.

Its consent wording is broader than ticket 07's deliberately narrow line and should **not** be copied over — ticket 07 chose narrow scope on purpose.

## Answer

All three values, sourced from UOB's own published pages and verified by fetching them.

| Slot | Value |
| --- | --- |
| `United Overseas Bank Limited` | **United Overseas Bank Limited** (Co. Reg. No. 193500026Z) |
| `dataprotectionofficer@uobgroup.com` | **dataprotectionofficer@uobgroup.com** |
| `https://www.uob.com.sg/assets/web-resources/uobgroup/pdf/privacy/uob-privacy-corporate.pdf` | **https://www.uob.com.sg/assets/web-resources/uobgroup/pdf/privacy/uob-privacy-corporate.pdf** |

Sources: [UOB Privacy & Security](https://www.uob.com.sg/uobgroup/privacy/index.page) · [UOB Privacy Notice (Corporate)](https://www.uob.com.sg/assets/web-resources/uobgroup/pdf/privacy/uob-privacy-corporate.pdf)

### The finished notice text

> United Overseas Bank Limited collects your name, company email and role to follow up on this conversation. We keep it for 90 days, then delete it. To withdraw, speak to our booth staff or contact dataprotectionofficer@uobgroup.com. [Privacy notice]

### Verification performed

The Corporate notice URL was fetched and opened, not merely linked. It resolves to a live 115 KB PDF titled **UOB PRIVACY NOTICE (CORPORATE)**, naming United Overseas Bank Limited with the registration number above, effective 1 July 2014.

**The PDF's metadata carries a `## RESTRICTED ##` classification stamp.** This is an internal document marking left on a file UOB publishes publicly — the document is freely fetchable and linked from UOB's own privacy page. It is cosmetic, not an access control, and is recorded here so nobody later mistakes it for a leak.

### The mismatch is sharper than it looked, and needs the DPO's eye

Before reading the notice, the concern was that it is "broader than what we collect". Having read it, the mismatch is more specific than that:

> *"this Privacy Notice forms a part of the terms and conditions governing your relationship with United Overseas Bank"* — and it governs Personal Data of *"your shareholders, beneficial owners, directors, employees, guarantors and authorised representatives"* for *"the products and services which you have applied for"*.

**A booth visitor has no relationship with UOB and has applied for nothing.** The notice describes a customer relationship that does not exist for the people this app collects from. It is the closest published document and linking it is defensible — but it is not a notice written for this situation, and the narrow consent sentence on the form is what actually governs the purpose.

This is exactly the sort of thing the DPO review already flagged on this ticket should look at. It does not block the build; a short event-specific notice remains the cleaner fix if there is time.

Minor, worth knowing: the linked notice describes collecting NRIC and passport numbers. This app never asks for either — ticket 01 makes that a hard rule — so a visitor who reads the notice may see collection described that goes well beyond what actually happens.

### The forwarding step, without which this contact does not work

The DPO mailbox is published, monitored and the channel UOB tells people to use. But **the DPO cannot action a deletion in this app** — the data sits in Supabase, outside UOB systems, with no route in.

**A withdrawal request arriving at the DPO mailbox must be forwarded to this project's data owner**, who runs the deletion. Without that step the address is a well-signposted dead end. Added to tickets 15 and 19.

### Consequences for other tickets

| Ticket | Effect |
| --- | --- |
| 07 | Placeholders filled with the values above; notice text final. |
| 13 | Check-in notice copy updated with the real controller and contact. |
| 11 | Both prototypes updated to show the real notice text. |
| 15 / 19 | The data owner must be reachable from the DPO mailbox — a named forwarding step, not an assumption. |
| 14 | The spec ships the finished notice text, no placeholders. |
