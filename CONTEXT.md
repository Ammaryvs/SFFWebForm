# BU Recommender

A UOB convention booth experience. A visitor taps an NFC tag, opens a pixel-art NPC conversation on their own phone, and is qualified, scored and routed to the Business Unit best placed to help them. Booth staff see live leads; organisers see the funnel.

## Language

### The visitor side

**Tap**:
A single NFC-triggered open of the visitor app. The unit of footfall.
_Avoid_: Scan, visit, impression

**Session**:
One run through the app from tap to close, identified by a client-minted id. A person who taps twice creates two Sessions.
_Avoid_: Journey, playthrough

**Footfall**:
The count of Taps. Deliberately redefined from physical booth traffic, which this system cannot observe.
_Avoid_: Traffic, visitors (as a count)

**Visitor**:
A person at the booth. Becomes identifiable only once they complete Check-in.
_Avoid_: User, player, prospect

**Check-in**:
The first screen, capturing name, company and company email, plus consent. What turns a Session into a Lead.
_Avoid_: Registration, sign-up, form

**NPC**:
The UOB receptionist character who conducts the conversation. Scripted, never generative.
_Avoid_: Bot, chatbot, assistant, agent

**Node**:
One step of the scripted conversation: an NPC line plus the options offered. The graph of Nodes is the whole conversation.
_Avoid_: Screen, question, step

**Interest**:
The broad area a Visitor picks at the first conversation Node — Growing, Managing Cash, Payments, Financing, Managing Risk, Digitalising, Just Exploring.
_Avoid_: Category, topic, vertical

**Need**:
The specific problem surfaced by follow-up Nodes, narrower than an Interest. "Cross-border collections" is a Need; "Payments" is an Interest.
_Avoid_: Pain point (reserved for the scoring input of that name), requirement

**Timeline**:
How soon the Visitor intends to act. A scoring input.
_Avoid_: Urgency, horizon

**Intent**:
How the Visitor is approaching the problem — actively looking, considering options, or researching. A scoring input, distinct from Timeline.
_Avoid_: Readiness, buying stage

### The lead side

**Lead**:
A Session that reached Check-in, carrying a contactable Visitor.
_Avoid_: Contact, record, entry

**Lead Score**:
A 0–100 number derived from Need, Timeline, Intent, decision influence, company fit and engagement.
_Avoid_: Rating, grade, points

**Band**:
The classification a Lead Score falls into — HOT, WARM, QUALIFIED or EXPLORATORY. Never shown to the Visitor.
_Avoid_: Tier, status, temperature

**BU**:
A UOB Business Unit — the team a Lead is routed to. The Visitor never sees a BU name.
_Avoid_: Department, team, product line

**Routing**:
The mapping from a terminal Node of the conversation to a BU.
_Avoid_: Assignment, matching, recommendation

**Handoff**:
Passing a Lead to its BU — either a live alert to booth staff during the event, or the post-event routed export.
_Avoid_: Referral, transfer, escalation

**CTA**:
The closing choice offered to a Visitor, worded to match their Band: talk to a specialist, send information, or explore solutions.
_Avoid_: Call to action (spell it out nowhere else), offer, next step

### The staff side

**Staff View**:
The live screen at the booth showing Leads as they arrive, with Band and recommended action.
_Avoid_: Console, admin, ops screen

**Funnel Dashboard**:
The organiser's read of the whole event — Taps through to Handoffs, plus the BU popularity split.
_Avoid_: Analytics, reporting, metrics page

**Export**:
The cloud Excel workbook of Leads, kept in sync from the source-of-truth database. A derived artefact, never the store.
_Avoid_: Database, sheet, backup
