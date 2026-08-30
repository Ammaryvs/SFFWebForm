# PDPA consent, retention and deletion

Type: grilling
Status: resolved

## Question

What exactly does the visitor consent to, and what happens to their data afterwards?

- **Consent wording.** The precise sentence next to the checkbox on the check-in form. It must state the purpose — UOB contacting them about the solutions discussed — in plain language, and must not be pre-ticked.
- **Placement.** On the check-in form (section 2), or at the CTA screen once they know what they are signing up for? Consenting before the conversation means consenting to an unknown purpose.
- **Scope of purpose.** Follow-up about this conversation only, or general marketing? These are different consents under PDPA, and the narrower one is far easier to justify.
- **Retention.** How long is a lead kept, and what triggers deletion — a fixed window after the event, or handover to a BU?
- **Deletion path.** How does a visitor withdraw consent or ask for deletion, and who actions it?
- **Controller and notice.** Who is named as the data controller, and what does the privacy-notice link point at?
- **Abandoned sessions.** If someone gives their email at check-in then walks away without consenting, is that record kept?

## Comments

### Noted from ticket 03 session, 2026-08-30

**The check-in artwork does not match the check-in this map assumes.** `Game Assets/Contact Detail Form.jpg` shows four fields — **Full Name, Email Address, Phone Number, Address** — plus Cancel/Submit. `CONTEXT.md` defines Check-in as "name, company and company email, plus consent".

Two PDPA-relevant gaps follow:

- **There is no consent checkbox in the artwork.** This ticket's "must not be pre-ticked" requirement has nowhere to live on the reference form; the checkbox is net-new CSS.
- **The art collects home Address and Phone.** Address in particular is PDPA-heavy personal data with no stated purpose in the brief's funnel — it is not a scoring input, not a routing input, and not needed for follow-up. Recommend dropping Address entirely and justifying Phone against the consent purpose, rather than collecting it because the reference art shows a box for it.

### Session 2026-08-30 — decisions banked

1. **Consent scope is narrow: follow-up about this conversation only.** Not general marketing. A BU that wants a broader relationship seeks its own consent later, on its own terms.
2. **Fields: Full Name, Company Email, Role, and Phone as genuinely optional. Address is dropped.**
   - Address served no purpose anywhere in the scoring, routing or export design — collecting it was an artefact of the reference artwork, and purpose limitation is exactly what that fails.
   - **Phone brings PDPA Part 9 (DNC Registry) into scope.** A Singapore number may not be called or SMSed for marketing without either a DNC check or *clear and unambiguous consent in evidential form*. So phone carries its **own separate, unticked channel consent**, distinct from the purpose consent. Storing the tick alone is not enough — the record must show what was agreed and when, which is what "evidential form" means. **Ticket 06 must therefore persist consent as evidence, not as a boolean:** the exact wording shown, its version, the UTC timestamp, and which boxes were ticked.
3. **Placement: the consent tick sits on the check-in form. Settled by reasoning, not grilled.**
   - Consent belongs at the point of collection, and check-in *is* the collection. `CONTEXT.md` ratifies Check-in as "the first screen", and ticket 03's graph is built on it, so moving the form later would invalidate work already done.
   - The ticket's "unknown purpose" objection does not bite, because the narrow purpose is fully stateable before the conversation: *contact me about the solutions we discuss here*. The visitor knows what they are agreeing to even though they do not yet know the answers.
   - The CTA choice (specialist / information / explore) is a **preference, not a second consent**. It must not be worded as though it grants anything.

4. **Retention: 90 days after the event, then hard delete.** A scheduled job, not a person remembering. Once a Lead is handed to a BU, the BU's CRM is the system of record — this app's copy still dies at +90d, so it never becomes a shadow CRM. **Ticket 15 owns scheduling the deletion job; ticket 12 must land the export before the window closes.**
5. **Abandoned sessions: without the tick, nothing personal is ever transmitted.** Submit stays disabled, so no unconsented personal data exists to retain, breach or delete. The Session is still counted as a Tap and as a started conversation, so the funnel keeps its denominator (ticket 10).
6. **Withdrawal: booth staff action it on the spot.** A visitor who changes their mind tells staff, who note it and it is actioned after the event. **Ticket 15 must carry this in the staff runbook**, since it is now a staff duty rather than a software feature.
   - **Gap this leaves, recorded deliberately:** it covers only visitors still at the booth, while data is retained for 90 days, and PDPA gives a right to withdraw consent on reasonable notice. The consent wording therefore still names a contact for later requests — that value is [ticket 17](17-privacy-notice-facts.md).

---

## Answer

### Consent wording

Two unticked boxes on the check-in form. Neither is pre-ticked; the first gates Submit, the second is only enabled when a phone number is entered.

> `[ ]` **I agree that UOB may contact me about the solutions we discuss here today.**
>
> `[ ]` *(only if a phone number is given)* **UOB may call or SMS me on this number about those solutions.**

Below the boxes, as notice rather than consent:

> `United Overseas Bank Limited` collects your name, company email and role to follow up on this conversation. We keep it for 90 days after the event, then delete it. To withdraw, speak to our booth staff or contact `dataprotectionofficer@uobgroup.com`. [Privacy notice](`https://www.uob.com.sg/assets/web-resources/uobgroup/pdf/privacy/uob-privacy-corporate.pdf`)

The three `{...}` slots are named placeholders filled from [ticket 17](17-privacy-notice-facts.md) at build time — the same pattern the map already accepts for BU owner mailboxes.

### Summary of the design

| Question | Resolution |
| --- | --- |
| Scope | Narrow — follow-up on this conversation only. Not marketing. |
| Placement | On the check-in form, at the point of collection. |
| Fields | Name, company email, role; phone optional. **Address dropped.** |
| Phone | Separate channel consent, because PDPA Part 9 (DNC) applies. |
| Consent record | Evidence, not a boolean: wording text, version, UTC timestamp, which boxes. |
| Retention | 90 days after the event, hard delete by scheduled job. |
| Withdrawal | Booth staff on the spot; named contact for later requests. |
| No consent | Submit disabled; no personal data transmitted at all. |
| Controller / notice | Placeholders — [ticket 17](17-privacy-notice-facts.md). |

### Consequences for other tickets

- **Ticket 06** — persist consent as an evidential record (wording, version, timestamp, boxes ticked), not a boolean. Add `role`; do not add address.
- **Ticket 11** — the check-in form is Name / Company Email / Role / Phone (optional) plus two checkboxes and a notice block. The reference artwork's Address field is gone and its Phone field is now optional.
- **Ticket 15** — owns both the scheduled 90-day deletion job and the staff withdrawal procedure.
- **Ticket 12** — the routed export must complete well inside the 90-day window.
- **Ticket 08** — queued offline submissions must not transmit personal data before the tick, and a queued payload sitting on the device still counts against the retention promise.

### Not legally reviewed

This is a defensible design, not a compliance sign-off. The B2B business-contact-information carve-out and the DNC treatment both warrant a DPO's eye — flagged in [ticket 17](17-privacy-notice-facts.md).

### Omissions found after resolution, 2026-08-31

A sibling effort's PDPA ticket (`Downloads/SFF 2D Web Game/.scratch/uob-booth-game/issues/01-compliance-consent-requirements.md`) covers three things this answer does not. None invalidates a decision above, so this ticket stays resolved — but the spec should not ship without a position on them:

- **Security baseline.** No statement here on encryption at rest or HTTPS in transit. Ticket 01 put both internal surfaces behind a single shared PIN showing real names and company emails, which makes this more pointed, not less.
- **Minors.** No position taken. Booth traffic is presumed working professionals, but "presumed" should be written down as a deliberate choice rather than left silent.
- **Breach notification.** PDPA's breach-notification obligation is an operational process rather than something the app implements, but with real PII in a third-party database someone should own it.

Also flagged on [ticket 17](17-privacy-notice-facts.md): that effort chose **6-month** retention against this ticket's **90 days**, and carried a sensible carve-out this ticket lacks — that a visitor who becomes an active lead or customer falls under normal banking retention for that relationship instead.

### Amendment 2026-08-31 — retention carve-out adopted

Retention stays **90 days after the event**, unchanged. One exception is added, adopted from the sibling effort's PDPA work after a deliberate cross-check:

> **A Lead that has become an active lead or customer is exempt from the 90-day deletion; normal UOB banking retention governs that relationship instead.**

**Why this was a real hole.** As originally written, the deletion job would delete a Lead a BU was actively pursuing, 90 days in, with no exception — destroying the record mid-conversation. The rule was designed to stop this app becoming a shadow CRM, which is still right for the default case, but it should not override a live customer relationship.

**What this now needs, and does not yet have:** a definition of *active*, and something in the system that records it. The obvious candidate is the handled or followed-up marker on a Lead — which ticket 09 was already considering for the Staff View and ticket 12 for the export. That marker is now **load-bearing for retention**, not just workflow convenience.

- **Ticket 09 / 12** — whichever owns the handled marker owns the input to this exemption. It must be durable and it must be exportable.
- **Ticket 15** — the 90-day deletion job must skip exempt Leads, and the data owner must be able to say afterwards which were skipped and why.

The two efforts remain deliberately separate (user decision, 2026-08-31), so this map keeps 90 days while the sibling keeps 6 months. That divergence is now intentional and recorded, not an accident.

### Correction 2026-08-31 — Company Name was wrongly dropped from the field list

Decision 2 above enumerates the check-in fields as "Full Name, Company Email, Role, and Phone as genuinely optional". **That list is incomplete.** Brief §2 collects Name, **Company Name** and Company Email; `CONTEXT.md` defines Check-in the same way; §16's staff mock-up displays the company. It is not derivable from the email domain.

Company Name was lost by accident while deciding what to *remove* (Address) and what to *add* (Role), not by any decision. Restored by ticket 06.

The correct check-in field list is: **Full Name, Company Name, Company Email, Role, Phone (optional)**, plus the two consent boxes. Nothing else in this ticket changes — Address stays dropped, Phone stays optional behind its own channel consent.

### Extended by ticket 12, 2026-08-31 — retention covers generated artefacts

Two clarifications to the retention and consent position:

- **Phone consent is enforced at the export boundary.** The `Phone` cell in any exported pack is **empty wherever `consent_phone_given` is false**, even though the number is stored. A BU owner cannot call a number they were never given, which makes the PDPA Part 9 position structural rather than dependent on someone reading a policy note.
- **The 90-day deletion must include generated packs.** This ticket's retention rule addressed the `leads` table only. Exported `.xlsx` packs in Supabase Storage are copies of the same personal data and must be purged on the same schedule — otherwise the database is cleaned while the spreadsheets survive. Forwarded copies are outside our control, so each pack carries a cover sheet stating the consent purpose, the retention expectation, and that an empty Phone cell means no call or SMS consent.
