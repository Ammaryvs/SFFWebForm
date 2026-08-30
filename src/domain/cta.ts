/**
 * The CTA screen — spec §6.
 *
 * Presentation only. Which action is emphasised comes from the
 * *provisional* band; the visitor's choice then feeds Engagement and the
 * final band (see scoring.ts). All three actions are always present and
 * selectable in every band.
 */

import type { Band, CtaAction, CtaOption } from './types';

/**
 * Identical for all four bands. A headline that warmed for HOT and cooled
 * for EXPLORATORY would tell the visitor how they had been graded.
 */
export const CTA_HEADLINE = 'Thanks! How can we help from here?';

/**
 * Four wordings across three actions. Only the follow-up action's wording
 * moves, and only for WARM — Engagement is scored on the action, so HOT and
 * WARM score identically for the same decision.
 */
const FOLLOW_UP_WORDING: Readonly<Record<Band, string>> = {
  HOT: 'Talk to a Specialist',
  WARM: 'Request a Follow-Up',
  QUALIFIED: 'Talk to a Specialist',
  EXPLORATORY: 'Talk to a Specialist',
};

const SEND_INFO_WORDING = 'Send Me Information';
const EXPLORE_WORDING = 'Explore Solutions';

/**
 * Emphasis walks down the list as the band cools: the softer the lead, the
 * lower the pressure of the highlighted action.
 */
const EMPHASIS: Readonly<Record<Band, CtaAction>> = {
  HOT: 'bu_follow_up',
  WARM: 'bu_follow_up',
  QUALIFIED: 'send_info',
  EXPLORATORY: 'explore',
};

export function emphasisedActionFor(band: Band): CtaAction {
  return EMPHASIS[band];
}

/** The three actions in fixed reading order. */
export function ctaOptionsFor(band: Band): readonly CtaOption[] {
  const emphasised = emphasisedActionFor(band);
  const build = (action: CtaAction, label: string): CtaOption => ({
    action,
    label,
    emphasised: action === emphasised,
  });

  return [
    build('bu_follow_up', FOLLOW_UP_WORDING[band]),
    build('send_info', SEND_INFO_WORDING),
    build('explore', EXPLORE_WORDING),
  ];
}

/** Edge copy (spec §6). Identical whether the POST landed or queued. */
export const CONFIRMATION_COPY = {
  headline: "Thanks! We'll be in touch soon.",
  subline: "You're all set.",
} as const;

export const SPLASH_COPY = {
  wordmark: 'UOB',
  status: 'Loading…',
} as const;

/**
 * Where "Explore Solutions" sends the visitor. Open item (spec §18) — until
 * UOB collateral is chosen this stays on the public business site rather
 * than shipping a dead link.
 */
export const EXPLORE_DESTINATION_URL = 'https://www.uob.com.sg/corporate/';
