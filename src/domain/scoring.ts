/**
 * Lead scoring — spec §8.
 *
 * Two phases, and this is forced rather than stylistic. Engagement is
 * scored from the CTA choice; the CTA is chosen from the band; the band
 * comes from the score. That is a closed loop, broken like this:
 *
 *   answers          -> provisional score (0-90) -> provisional band
 *   provisional band -> which CTA is emphasised
 *   visitor chooses  -> Engagement (0 or 10)
 *   final score      = provisional + Engagement  (0-100)
 *   final band       = band(final score)
 *
 * The provisional band only decides CTA presentation. The final band is
 * what is stored, shown to staff, and used for handoff.
 *
 * Pure and total. Called on the client to pick the CTA and again on the
 * server at submit — the client's own numbers are never trusted.
 */

import type {
  Answers,
  Band,
  CtaAction,
  FinalScore,
  IntentId,
  OptionId,
  ProvisionalScore,
  RoleId,
  ScoreBreakdown,
  TimelineId,
} from './types';
import { SCORING_VERSION } from './types';

/* -------------------------------------------------------------------------
 * Company fit
 * ---------------------------------------------------------------------- */

/**
 * Free-mail providers. Repurposed from the brief's "strategic / target
 * company" row, which required a list that does not exist; corporate versus
 * free-mail is computable at check-in and genuinely discriminating at a B2B
 * booth.
 *
 * Matched on the first label, so regional variants (`yahoo.com.sg`,
 * `hotmail.co.uk`) are caught without enumerating every TLD.
 *
 * Accepted cost: a real small business on a free address loses 10 points.
 * It is never a reason to reject the address.
 */
const FREE_MAIL_LABELS: ReadonlySet<string> = new Set([
  'gmail',
  'googlemail',
  'yahoo',
  'ymail',
  'rocketmail',
  'hotmail',
  'outlook',
  'live',
  'msn',
  'icloud',
  'me',
  'mac',
  'aol',
  'proton',
  'protonmail',
  'pm',
  'zoho',
  'gmx',
  'mail',
  'yandex',
  'qq',
  '163',
  '126',
  'sina',
  'foxmail',
  'naver',
  'singnet',
  'starhub',
  'pacific',
  // Common disposables.
  'mailinator',
  'guerrillamail',
  'yopmail',
  '10minutemail',
  'tempmail',
  'trashmail',
  'sharklasers',
  'dispostable',
]);

/** Lowercased domain part, or '' when the address has no `@`. */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 0) return '';
  return email.slice(at + 1).trim().toLowerCase();
}

export function isCorporateDomain(domain: string): boolean {
  const normalised = domain.trim().toLowerCase();
  if (normalised === '') return false;
  const firstLabel = normalised.split('.')[0] ?? '';
  return !FREE_MAIL_LABELS.has(firstLabel);
}

/* -------------------------------------------------------------------------
 * Phase 1
 * ---------------------------------------------------------------------- */

/**
 * The two need options that say nothing actionable. They are also the two
 * that route to `other_unrouted`, so scoring and routing agree on who named
 * no real need.
 */
const NON_COMMITTAL_NEEDS: ReadonlySet<OptionId> = new Set([
  'need.just_exploring.nothing_specific',
  'need.managing_risk.minimal_fx',
]);

const TIMELINE_POINTS: Readonly<Record<TimelineId, number>> = {
  'timeline.immediate': 20,
  'timeline.1_3_months': 15,
  'timeline.3_6_months': 10,
  'timeline.6_12_months': 5,
  'timeline.no_timeline': 0,
};

const INTENT_POINTS: Readonly<Record<IntentId, number>> = {
  'intent.actively_looking': 20,
  'intent.considering': 10,
  'intent.researching': 5,
};

/** Decision influence. Self-reported seniority is inflatable; accepted. */
const INFLUENCE_POINTS: Readonly<Record<RoleId, number>> = {
  owner_c_suite_director: 15,
  manager_finance: 10,
  executive_analyst_other: 5,
};

export interface ScoringInput {
  readonly answers: Answers;
  readonly role: RoleId;
  readonly companyEmail: string;
}

/**
 * Phase 1. Maximum 90, so HOT is reachable before the CTA; minimum 20 for a
 * complete session, because everyone answers `need`, `intent` and has a
 * role. Nobody scores zero, and that is not a bug.
 */
export function scoreProvisional(input: ScoringInput): ProvisionalScore {
  const { answers, role, companyEmail } = input;

  const needPoints =
    answers.need === null ? 0 : NON_COMMITTAL_NEEDS.has(answers.need) ? 10 : 25;

  const breakdown: ScoreBreakdown = {
    needPoints,
    timelinePoints:
      answers.timeline === null ? 0 : (TIMELINE_POINTS[answers.timeline] ?? 0),
    intentPoints:
      answers.intent === null ? 0 : (INTENT_POINTS[answers.intent] ?? 0),
    influencePoints: INFLUENCE_POINTS[role] ?? 0,
    fitPoints: isCorporateDomain(emailDomain(companyEmail)) ? 10 : 0,
  };

  const provisionalScore =
    breakdown.needPoints +
    breakdown.timelinePoints +
    breakdown.intentPoints +
    breakdown.influencePoints +
    breakdown.fitPoints;

  const isIncomplete =
    answers.interest === null ||
    answers.need === null ||
    answers.timeline === null ||
    answers.intent === null;

  return {
    breakdown,
    provisionalScore,
    provisionalBand: bandFor(provisionalScore, isIncomplete),
    isIncomplete,
  };
}

/* -------------------------------------------------------------------------
 * Bands
 * ---------------------------------------------------------------------- */

/**
 * An incomplete session is capped at EXPLORATORY regardless of computed
 * score — otherwise someone answering only `need` with a senior title and a
 * corporate domain lands in QUALIFIED on a third of a conversation. The raw
 * score is still stored.
 */
export function bandFor(score: number, isIncomplete = false): Band {
  if (isIncomplete) return 'EXPLORATORY';
  if (score >= 80) return 'HOT';
  if (score >= 60) return 'WARM';
  if (score >= 40) return 'QUALIFIED';
  return 'EXPLORATORY';
}

/* -------------------------------------------------------------------------
 * Phase 2
 * ---------------------------------------------------------------------- */

/** Scored on the action, not the wording, so HOT and WARM score alike. */
const ENGAGEMENT_ACTION: CtaAction = 'bu_follow_up';

/**
 * Phase 2. A lead may move up a band by choosing a specialist — correct,
 * since agreeing to a follow-up genuinely is a stronger signal.
 */
export function finaliseScore(
  provisional: ProvisionalScore,
  ctaAction: CtaAction,
): FinalScore {
  const engagementPoints = ctaAction === ENGAGEMENT_ACTION ? 10 : 0;
  const finalScore = provisional.provisionalScore + engagementPoints;

  return {
    ...provisional,
    engagementPoints,
    finalScore,
    band: bandFor(finalScore, provisional.isIncomplete),
    scoringVersion: SCORING_VERSION,
  };
}

/** The whole of scoring, for the server's re-computation at submit. */
export function scoreSubmission(
  input: ScoringInput,
  ctaAction: CtaAction,
): FinalScore {
  return finaliseScore(scoreProvisional(input), ctaAction);
}
