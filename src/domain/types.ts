/**
 * Shared domain types — spec §5, §8, §9, §10.
 *
 * Imported by the visitor app, the staff view, the dashboard and the API
 * routes. Nothing in `src/domain` may import React, Next or Supabase: the
 * node graph, the scoring function and the routing function are pure and
 * total, and staying that way is what makes them testable.
 */

/* -------------------------------------------------------------------------
 * The node graph (spec §5)
 * ---------------------------------------------------------------------- */

/** Stable snake_case ids. Never renumbered, never reused. */
export type NodeId =
  | 'checkin'
  | 'interest'
  | `need.${string}`
  | 'timeline'
  | 'intent'
  | 'cta';

/**
 * A fully-qualified option id, e.g. `interest.payments`,
 * `need.payments.cross_border`, `timeline.immediate`.
 */
export type OptionId = string;

/** The seven Interests (spec §5). */
export type InterestId =
  | 'interest.growing'
  | 'interest.managing_cash'
  | 'interest.payments'
  | 'interest.financing'
  | 'interest.managing_risk'
  | 'interest.digitalising'
  | 'interest.just_exploring';

export type TimelineId =
  | 'timeline.immediate'
  | 'timeline.1_3_months'
  | 'timeline.3_6_months'
  | 'timeline.6_12_months'
  | 'timeline.no_timeline';

export type IntentId =
  | 'intent.actively_looking'
  | 'intent.considering'
  | 'intent.researching';

export interface ChoiceOption {
  readonly id: OptionId;
  /** <= 22 characters (spec §4 copy budget). */
  readonly label: string;
}

/**
 * One step of the scripted conversation: an NPC line plus the options
 * offered. The persistent exit is not an option — it is rendered by the UI
 * on every node — so `options` is exactly the set routing must cover.
 */
export interface ConversationNode {
  readonly id: NodeId;
  /** <= 78 characters (spec §4 copy budget). */
  readonly line: string;
  readonly options: readonly ChoiceOption[];
}

/* -------------------------------------------------------------------------
 * Check-in (spec §7)
 * ---------------------------------------------------------------------- */

/** The role dropdown options — these *are* the decision-influence tiers. */
export type RoleId =
  | 'owner_c_suite_director'
  | 'manager_finance'
  | 'executive_analyst_other';

export interface CheckinDetails {
  readonly fullName: string;
  readonly companyName: string;
  readonly companyEmail: string;
  readonly role: RoleId;
  /** Optional. Present does not imply contactable — see `consentPhone`. */
  readonly phone: string | null;
  /** Gates the write. No tick, no transmission. */
  readonly consentPurpose: boolean;
  /** PDPA Part 9. Blanks the export's Phone cell when false. */
  readonly consentPhone: boolean;
}

/* -------------------------------------------------------------------------
 * Scoring (spec §8)
 * ---------------------------------------------------------------------- */

export type Band = 'HOT' | 'WARM' | 'QUALIFIED' | 'EXPLORATORY';

/** Bumped when the scoring function changes; stored on every lead. */
export const SCORING_VERSION = 'v1';

/**
 * The answers scoring reads. All four are nullable: the persistent exit is
 * on every node, so a visitor can reach the CTA having answered none of
 * them. Unanswered categories score 0 (spec §8).
 */
export interface Answers {
  readonly interest: InterestId | null;
  readonly need: OptionId | null;
  readonly timeline: TimelineId | null;
  readonly intent: IntentId | null;
}

export interface ScoreBreakdown {
  readonly needPoints: number;
  readonly timelinePoints: number;
  readonly intentPoints: number;
  readonly influencePoints: number;
  readonly fitPoints: number;
}

/** Phase 1 — everything knowable before the CTA is shown. */
export interface ProvisionalScore {
  readonly breakdown: ScoreBreakdown;
  /** 0-90. */
  readonly provisionalScore: number;
  /** Decides only which CTA action is emphasised. Never stored. */
  readonly provisionalBand: Band;
  /** True when any of the four conversation nodes went unanswered. */
  readonly isIncomplete: boolean;
}

/** Phase 2 — the record that is frozen onto the lead. */
export interface FinalScore extends ProvisionalScore {
  /** +10 for the BU follow-up action, 0 otherwise. */
  readonly engagementPoints: number;
  /** 0-100, raw. Not capped, even when `isIncomplete`. */
  readonly finalScore: number;
  /** Capped at EXPLORATORY when `isIncomplete`. Stored, shown, routed on. */
  readonly band: Band;
  readonly scoringVersion: string;
}

/* -------------------------------------------------------------------------
 * The CTA (spec §6, §8)
 * ---------------------------------------------------------------------- */

/** Three actions. Engagement is scored on the action, never the wording. */
export type CtaAction = 'bu_follow_up' | 'send_info' | 'explore';

export interface CtaOption {
  readonly action: CtaAction;
  /** Four wordings across the three actions (spec appendix). */
  readonly label: string;
  readonly emphasised: boolean;
}

/* -------------------------------------------------------------------------
 * Routing (spec §9)
 * ---------------------------------------------------------------------- */

export type BuId =
  | 'business_banking'
  | 'cash_management'
  | 'transaction_banking'
  | 'trade_finance'
  | 'markets_treasury'
  | 'digital'
  | 'corporate_investment'
  | 'other_unrouted';

export interface BusinessUnit {
  /** Placeholder until real UOB names land (spec §18). */
  readonly label: string;
  /** Empty until owner mailboxes exist. */
  readonly ownerEmail: string;
}

export interface RoutingEntry {
  readonly primary: BuId;
  /** Null everywhere. Enabling it would give one lead two owners. */
  readonly secondary: BuId | null;
}

export interface RoutingConfig {
  readonly businessUnits: Readonly<Record<BuId, BusinessUnit>>;
  readonly routing: Readonly<Record<OptionId, RoutingEntry>>;
}

/* -------------------------------------------------------------------------
 * Records (spec §10)
 * ---------------------------------------------------------------------- */

/** One row per tap. No personal data, ever — so it is never deleted. */
export interface SessionRecord {
  readonly session_id: string;
  readonly tapped_at: string;
  readonly engaged_at: string | null;
  readonly user_agent: string;
  readonly source: 'nfc' | 'tablet';
}

/**
 * One immutable row per completed session. Append-only: two taps by one
 * person are two rows, and dedupe is a read-time rule.
 *
 * Score, band and BU are frozen at submission and never recomputed on read
 * — the visitor was shown a CTA chosen from that band.
 */
export interface LeadRecord {
  readonly id: string;
  readonly session_id: string;
  readonly submitted_at: string;

  readonly full_name: string;
  readonly company_name: string;
  readonly company_email: string;
  readonly role: RoleId;
  readonly phone: string | null;

  readonly email_domain: string;
  readonly is_corporate_domain: boolean;

  readonly interest: InterestId | null;
  readonly need: OptionId | null;
  readonly timeline: TimelineId | null;
  readonly intent: IntentId | null;

  readonly need_points: number;
  readonly timeline_points: number;
  readonly intent_points: number;
  readonly influence_points: number;
  readonly fit_points: number;
  readonly provisional_score: number;
  readonly engagement_points: number;
  readonly final_score: number;
  readonly band: Band;
  readonly scoring_version: string;

  readonly cta_action: CtaAction;
  readonly cta_wording_shown: string;

  readonly primary_bu: BuId;
  readonly secondary_bu: BuId | null;

  readonly is_incomplete: boolean;
  readonly handled_at: string | null;
  readonly handled_by: string | null;
  /** Set by Mark handled. Stops the 90-day job deleting a live pursuit. */
  readonly retention_exempt: boolean;

  readonly consent_version: string;
  readonly consent_purpose_given: boolean;
  readonly consent_phone_given: boolean;
  readonly consent_at: string;
}

/** Insert-only. Editing wording inserts a new row — never an update. */
export interface ConsentVersionRecord {
  readonly version: string;
  readonly purpose_text: string;
  readonly phone_text: string;
  readonly notice_text: string;
  readonly effective_from: string;
}

/* -------------------------------------------------------------------------
 * The wire payload (spec §11 — one POST, at the CTA)
 * ---------------------------------------------------------------------- */

/**
 * The entire body of the single POST. A few hundred bytes, so it queues in
 * `localStorage`. Scoring is redone server-side from these inputs; the
 * client's own numbers are never trusted.
 */
export interface SubmitPayload {
  readonly sessionId: string;
  readonly checkin: CheckinDetails;
  readonly answers: Answers;
  readonly ctaAction: CtaAction;
  readonly ctaWordingShown: string;
  readonly consentVersion: string;
  readonly consentAt: string;
  readonly source: 'nfc' | 'tablet';
  /** Set when the payload was queued offline, for the 7-day expiry. */
  readonly queuedAt: string;
}
