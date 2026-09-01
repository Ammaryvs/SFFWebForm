/**
 * The conversation node graph and its copy deck — spec §5 and §6.
 *
 * Bundled into the visitor app as a static import, which is what makes the
 * whole conversation run with no network (spec §3, §11). Pure data plus
 * three total functions over it; no React, no fetch.
 *
 * Node and option ids are stable snake_case. They are never renumbered and
 * never reused: they are stored on every lead and are the key routing
 * looks up.
 */

import type {
  Answers,
  ChoiceOption,
  ConversationNode,
  InterestId,
  NodeId,
  OptionId,
} from './types';

/**
 * Copy budgets at 360px (spec §4).
 *
 * Exact arithmetic under Press Start 2P, which was fixed-advance at 1.0em
 * per character. The build ships Silkscreen, which is proportional and
 * narrower, so these are now a CONSERVATIVE guard: the real limit is
 * larger, and anything passing here fits. Re-measure on a real 360px phone
 * at rehearsal before relaxing them.
 */
export const NPC_LINE_BUDGET = 78;
export const CHOICE_LABEL_BUDGET = 22;

/**
 * The persistent exit, rendered on every node.
 *
 * Under a single terminal submit this is the only route by which a
 * departing visitor is captured at all, so it is rendered prominently, not
 * as a grudging grey row. Its label is deliberately not Interest-shaped:
 * "I'm just looking around" sat one row under "Just Exploring" and led to
 * the opposite outcome.
 */
export const EXIT_OPTION: ChoiceOption = {
  id: 'exit',
  label: 'Skip to the end',
};

/** The one NPC. Shown on the name plate of every screen they speak on. */
export const NPC_NAME = 'RECEPTIONIST';

/**
 * What the receptionist says outside the node graph — spec §4, §6.
 *
 * Two spoken moments bracket check-in: a greeting that leads into the
 * form, and a thank-you that leads into the questions. Neither asks the
 * visitor to choose anything, so neither has a choice panel; the visitor
 * taps the dialogue box to move on.
 *
 * Both are phrased as statements, never questions. With no choice panel on
 * screen, a question mark leaves the visitor hunting for options that are
 * not there.
 *
 * Each entry is ONE SCREEN, and its lines share a single dialogue box. One
 * thought per tap is what makes this read as somebody talking rather than
 * as a paragraph of onboarding copy — and every line stays inside the NPC
 * budget, so no screen can outgrow its box.
 */
type SpeechBeats = readonly (readonly string[])[];

/**
 * Before check-in. The second beat asks for the details in the same breath
 * a person at a desk would, so the form that follows arrives as something
 * somebody asked for rather than as a wall of fields in front of a
 * stranger.
 *
 * It is warm but promises nothing about what happens to those details:
 * that claim belongs to the consent block on the form itself, where it is
 * versioned and evidenced, and repeating it here in friendlier words would
 * only create a second, looser promise.
 */
export const WELCOME_BEATS = [
  ["Hi there, and welcome to the UOB booth! I'm the receptionist."],
  ["Let's get to know you first. Please leave your contact details."],
] as const satisfies SpeechBeats;

/**
 * After check-in, before the first question. It closes the errand the
 * greeting opened — the visitor did the thing that was asked of them, and
 * is told what the rest of the minute is for before being asked to choose
 * anything.
 */
export const THANKS_BEATS = [
  [
    'Thank you for filling up the form!',
    "Let's have a short chat and I'll point you to the right team.",
  ],
] as const satisfies SpeechBeats;

/**
 * The whole dialogue box is the tap target, so the hint sits inside it
 * rather than becoming a button of its own — a button here would read as
 * the first choice of the conversation, which these screens do not have.
 */
export const SPEECH_TAP_HINT = 'tap to continue';

export const INTEREST_NODE = {
  id: 'interest',
  line: "Welcome to UOB! What's most relevant to your business right now?",
  options: [
    { id: 'interest.growing', label: 'Growing' },
    { id: 'interest.managing_cash', label: 'Managing Cash' },
    { id: 'interest.payments', label: 'Payments' },
    { id: 'interest.financing', label: 'Financing' },
    { id: 'interest.managing_risk', label: 'Managing Risk' },
    { id: 'interest.digitalising', label: 'Digitalising' },
    { id: 'interest.just_exploring', label: 'Just Exploring' },
  ],
} as const satisfies ConversationNode & {
  options: readonly { id: InterestId; label: string }[];
};

export const NEED_NODES = {
  'need.growing': {
    id: 'need.growing',
    line: 'Growth it is. Are you growing locally or heading overseas?',
    options: [
      { id: 'need.growing.local', label: 'Growing locally' },
      { id: 'need.growing.asean', label: 'Into ASEAN' },
      { id: 'need.growing.greater_china', label: 'Into Greater China' },
      { id: 'need.growing.anz', label: 'Into Australia / NZ' },
      { id: 'need.growing.europe', label: 'Into Europe' },
      { id: 'need.growing.us', label: 'Into the US' },
      { id: 'need.growing.other_overseas', label: 'Somewhere else' },
    ],
  },
  'need.managing_cash': {
    id: 'need.managing_cash',
    line: 'Cash flow, then. What would help most day to day?',
    options: [
      { id: 'need.managing_cash.visibility', label: 'Seeing cash clearly' },
      {
        id: 'need.managing_cash.optimise_excess_cash',
        label: 'Using spare cash',
      },
      { id: 'need.managing_cash.access_to_funds', label: 'Access to funds' },
      { id: 'need.managing_cash.working_capital', label: 'Working capital' },
    ],
  },
  'need.payments': {
    id: 'need.payments',
    line: "Payments it is. What's the biggest headache today?",
    options: [
      { id: 'need.payments.too_manual', label: 'Too manual' },
      { id: 'need.payments.too_many_platforms', label: 'Too many platforms' },
      { id: 'need.payments.cross_border', label: 'Cross-border' },
      { id: 'need.payments.reconciliation', label: 'Reconciliation' },
      { id: 'need.payments.get_paid_faster', label: 'Getting paid faster' },
      { id: 'need.payments.processing_time_cost', label: 'Cost or speed' },
    ],
  },
  'need.financing': {
    id: 'need.financing',
    line: 'Financing, got it. What are you looking to fund?',
    options: [
      { id: 'need.financing.growth', label: 'Growth or expansion' },
      { id: 'need.financing.working_capital', label: 'Working capital' },
      {
        id: 'need.financing.specific_investment',
        label: 'A specific investment',
      },
      { id: 'need.financing.trade', label: 'Trade' },
    ],
  },
  'need.managing_risk': {
    id: 'need.managing_risk',
    line: 'Risk, then. Where does it bite hardest?',
    options: [
      { id: 'need.managing_risk.fx_exposure', label: 'FX exposure' },
      { id: 'need.managing_risk.fx_rates', label: 'Better FX rates' },
      { id: 'need.managing_risk.volatility', label: 'Market swings' },
      { id: 'need.managing_risk.interest_rate', label: 'Interest rates' },
      { id: 'need.managing_risk.minimal_fx', label: 'We barely use FX' },
    ],
  },
  'need.digitalising': {
    id: 'need.digitalising',
    line: 'Digitalising, nice. Which part would you fix first?',
    options: [
      { id: 'need.digitalising.payments', label: 'Payments' },
      { id: 'need.digitalising.collections', label: 'Collections' },
      { id: 'need.digitalising.reconciliation', label: 'Reconciliation' },
      { id: 'need.digitalising.cash_management', label: 'Cash management' },
      { id: 'need.digitalising.reporting', label: 'Reporting' },
      { id: 'need.digitalising.trade', label: 'Trade' },
      { id: 'need.digitalising.other', label: 'Something else' },
    ],
  },
  'need.just_exploring': {
    id: 'need.just_exploring',
    line: "No problem. Anything you're curious about?",
    options: [
      { id: 'need.just_exploring.growing', label: 'Growing' },
      { id: 'need.just_exploring.cash', label: 'Cash flow' },
      { id: 'need.just_exploring.payments', label: 'Payments' },
      { id: 'need.just_exploring.financing', label: 'Financing' },
      { id: 'need.just_exploring.risk', label: 'FX and risk' },
      { id: 'need.just_exploring.digitalising', label: 'Going digital' },
      {
        id: 'need.just_exploring.nothing_specific',
        label: 'Nothing specific',
      },
    ],
  },
} as const satisfies Record<string, ConversationNode>;

export type NeedNodeId = keyof typeof NEED_NODES;

const TIMELINE_OPTIONS: readonly ChoiceOption[] = [
  { id: 'timeline.immediate', label: 'Now / under a month' },
  { id: 'timeline.1_3_months', label: '1-3 months' },
  { id: 'timeline.3_6_months', label: '3-6 months' },
  { id: 'timeline.6_12_months', label: '6-12 months' },
  { id: 'timeline.no_timeline', label: 'No set timeline' },
];

const INTENT_OPTIONS: readonly ChoiceOption[] = [
  { id: 'intent.actively_looking', label: 'Actively looking' },
  { id: 'intent.considering', label: 'Considering options' },
  { id: 'intent.researching', label: 'Just researching' },
];

/**
 * Two registers of the same node. The soft register is used on the
 * `just_exploring` branch: the NPC line changes, the option ids do not, so
 * scoring is identical either way.
 */
export type Register = 'standard' | 'soft';

export const TIMELINE_NODE: Record<Register, ConversationNode> = {
  standard: {
    id: 'timeline',
    line: 'Got it. When are you looking to sort this out?',
    options: TIMELINE_OPTIONS,
  },
  soft: {
    id: 'timeline',
    line: 'Fair enough. Is this a now thing or a someday thing?',
    options: TIMELINE_OPTIONS,
  },
};

export const INTENT_NODE: Record<Register, ConversationNode> = {
  standard: {
    id: 'intent',
    line: 'Last one. How are you approaching this right now?',
    options: INTENT_OPTIONS,
  },
  soft: {
    id: 'intent',
    line: 'Last one. Are you looking around or digging in?',
    options: INTENT_OPTIONS,
  },
};

/** Every distinct node, standard register — the canonical option lists. */
export const ALL_NODES: readonly ConversationNode[] = [
  INTEREST_NODE,
  ...Object.values(NEED_NODES),
  TIMELINE_NODE.standard,
  INTENT_NODE.standard,
];

/** Every NPC line the visitor can be shown, both registers. */
export const ALL_NPC_LINES: readonly { id: string; line: string }[] = [
  ...ALL_NODES.map((node) => ({ id: node.id, line: node.line })),
  { id: 'timeline (soft)', line: TIMELINE_NODE.soft.line },
  { id: 'intent (soft)', line: INTENT_NODE.soft.line },
];

/** The set routing must cover exactly. 40 options. */
export function needOptionIds(): ReadonlySet<OptionId> {
  const ids = new Set<OptionId>();
  for (const node of Object.values(NEED_NODES)) {
    for (const option of node.options) ids.add(option.id);
  }
  return ids;
}

/** `interest.payments` -> `need.payments`. The graph's only branch. */
export function needNodeIdFor(interestOptionId: OptionId): NeedNodeId | null {
  const suffix = interestOptionId.startsWith('interest.')
    ? interestOptionId.slice('interest.'.length)
    : null;
  if (suffix === null) return null;
  const candidate = `need.${suffix}`;
  return candidate in NEED_NODES ? (candidate as NeedNodeId) : null;
}

/** The softer wording is used on the just_exploring branch alone. */
export function registerFor(interest: InterestId | null): Register {
  return interest === 'interest.just_exploring' ? 'soft' : 'standard';
}

/**
 * The single edge function. Total: an unrecognised pairing falls through to
 * the CTA rather than stranding a visitor mid-conversation.
 */
export function nextNodeId(from: NodeId, optionId: OptionId): NodeId {
  if (optionId === EXIT_OPTION.id) return 'cta';
  if (from === 'checkin') return 'interest';
  if (from === 'interest') return needNodeIdFor(optionId) ?? 'cta';
  if (from.startsWith('need.')) return 'timeline';
  if (from === 'timeline') return 'intent';
  return 'cta';
}

const LABELS: ReadonlyMap<OptionId, string> = new Map(
  [...ALL_NODES.flatMap((node) => node.options), EXIT_OPTION].map((option) => [
    option.id,
    option.label,
  ]),
);

/**
 * Option ids render as labels at export time (spec §14). Falls back to the
 * id so a stored answer from an older deck is never displayed as blank.
 */
export function labelFor(optionId: OptionId | null): string {
  if (optionId === null) return '';
  return LABELS.get(optionId) ?? optionId;
}

/**
 * Position of an Interest in the panel, 0-based. The below-the-fold bias
 * (spec §13) is derivable from this given fixed config order — if the order
 * ever changes, store an `interest_order_version` on the lead or historical
 * ranks silently become wrong.
 */
export const INTEREST_ORDER_VERSION = 'v1';

export function interestRank(interestId: OptionId): number {
  return INTEREST_NODE.options.findIndex((option) => option.id === interestId);
}

/* -------------------------------------------------------------------------
 * Going back
 * ---------------------------------------------------------------------- */

/**
 * The label on the back control. Deliberately one word: it sits in the
 * chrome beside the name plate, not in the choice panel, and anything
 * longer starts to read as a thing the receptionist said.
 */
export const BACK_LABEL = 'Back';

/**
 * The order in which the graph collects its four answers.
 *
 * `need` covers all seven need nodes: which one a visitor saw is a
 * consequence of their Interest, not a separate answer.
 */
const ANSWER_STAGES = ['interest', 'need', 'timeline', 'intent'] as const;

function stageOf(nodeId: NodeId): number {
  if (nodeId === 'interest') return 0;
  if (nodeId.startsWith('need.')) return 1;
  if (nodeId === 'timeline') return 2;
  if (nodeId === 'intent') return 3;
  // `checkin` and `cta` own no answer. Returning the length means
  // `clearAnswersFrom` clears nothing, which is the right behaviour for a
  // node that never set anything.
  return ANSWER_STAGES.length;
}

/**
 * Stepping back to a node discards its answer and every answer after it.
 *
 * Not tidiness — correctness. A visitor who steps back from `timeline` to
 * `interest` and picks a different Interest is shown a different need node;
 * without this the need option from the ABANDONED branch would still be on
 * the payload, and routing (spec §9) keys off exactly that option. The lead
 * would be sent to a BU chosen by a question the visitor retracted.
 *
 * Clearing forward rather than only the current answer is what makes it
 * safe: the visitor re-walks the tree from wherever they rejoined it.
 */
export function clearAnswersFrom(answers: Answers, nodeId: NodeId): Answers {
  const from = stageOf(nodeId);
  return {
    interest: from <= 0 ? null : answers.interest,
    need: from <= 1 ? null : answers.need,
    timeline: from <= 2 ? null : answers.timeline,
    intent: from <= 3 ? null : answers.intent,
  };
}
