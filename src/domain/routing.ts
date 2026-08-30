/**
 * BU routing — spec §9.
 *
 * Routing keys off the need option id alone: the (interest, need) pair is
 * fully determined by it, so this is a flat 40-row lookup rather than a
 * path walk. Timeline and intent change the band, never the BU.
 *
 * The lead record stores the BU **id**, never the label, so renaming a BU
 * does not rewrite history.
 */

import type { BuId, OptionId, RoutingConfig, RoutingEntry } from './types';

/**
 * Placeholders. Real UOB names and owner mailboxes drop in here as config
 * (spec §18) — nothing else in the codebase needs to change when they do.
 */
const BUSINESS_UNITS: RoutingConfig['businessUnits'] = {
  business_banking: { label: 'Business Banking', ownerEmail: '' },
  cash_management: { label: 'Cash Management', ownerEmail: '' },
  transaction_banking: { label: 'Transaction Banking', ownerEmail: '' },
  trade_finance: { label: 'Trade Finance', ownerEmail: '' },
  markets_treasury: { label: 'Markets & Treasury', ownerEmail: '' },
  digital: { label: 'Digital', ownerEmail: '' },
  corporate_investment: { label: 'Corporate & Investment', ownerEmail: '' },
  // No owner. Excluded from the per-BU packs; still contactable, still
  // counted in the dashboard's "Other" row.
  other_unrouted: { label: 'Other (unrouted)', ownerEmail: '' },
};

/** `secondary` is null on every row — see SECONDARY_BU_IF_EVER_ENABLED. */
function to(primary: BuId): RoutingEntry {
  return { primary, secondary: null };
}

const ROUTING: Record<OptionId, RoutingEntry> = {
  // Growing — all seven.
  'need.growing.local': to('business_banking'),
  'need.growing.asean': to('business_banking'),
  'need.growing.greater_china': to('business_banking'),
  'need.growing.anz': to('business_banking'),
  'need.growing.europe': to('business_banking'),
  'need.growing.us': to('business_banking'),
  'need.growing.other_overseas': to('business_banking'),

  // Managing cash — working capital is a lending conversation, not a
  // cash-management one.
  'need.managing_cash.visibility': to('cash_management'),
  'need.managing_cash.optimise_excess_cash': to('cash_management'),
  'need.managing_cash.access_to_funds': to('cash_management'),
  'need.managing_cash.working_capital': to('business_banking'),

  // Payments — all six.
  'need.payments.too_manual': to('transaction_banking'),
  'need.payments.too_many_platforms': to('transaction_banking'),
  'need.payments.cross_border': to('transaction_banking'),
  'need.payments.reconciliation': to('transaction_banking'),
  'need.payments.get_paid_faster': to('transaction_banking'),
  'need.payments.processing_time_cost': to('transaction_banking'),

  // Financing.
  'need.financing.growth': to('business_banking'),
  'need.financing.working_capital': to('business_banking'),
  // The brief's otherwise-unreachable Acquisition / M&A row. A judgement
  // call: the alternative is business_banking and deleting the row.
  'need.financing.specific_investment': to('corporate_investment'),
  'need.financing.trade': to('trade_finance'),

  // Managing risk.
  'need.managing_risk.fx_exposure': to('markets_treasury'),
  'need.managing_risk.fx_rates': to('markets_treasury'),
  'need.managing_risk.volatility': to('markets_treasury'),
  'need.managing_risk.interest_rate': to('markets_treasury'),
  'need.managing_risk.minimal_fx': to('other_unrouted'),

  // Digitalising — all seven.
  'need.digitalising.payments': to('digital'),
  'need.digitalising.collections': to('digital'),
  'need.digitalising.reconciliation': to('digital'),
  'need.digitalising.cash_management': to('digital'),
  'need.digitalising.reporting': to('digital'),
  'need.digitalising.trade': to('digital'),
  'need.digitalising.other': to('digital'),

  // Just exploring — the same destinations, one level up.
  'need.just_exploring.growing': to('business_banking'),
  'need.just_exploring.cash': to('cash_management'),
  'need.just_exploring.payments': to('transaction_banking'),
  'need.just_exploring.financing': to('business_banking'),
  'need.just_exploring.risk': to('markets_treasury'),
  'need.just_exploring.digitalising': to('digital'),
  'need.just_exploring.nothing_specific': to('other_unrouted'),
};

export const ROUTING_CONFIG: RoutingConfig = {
  businessUnits: BUSINESS_UNITS,
  routing: ROUTING,
};

/**
 * Recorded for if a secondary BU is ever enabled. Not wired up: one lead
 * with two owners is chased twice or not at all, and the export needs an
 * unambiguous key.
 */
export const SECONDARY_BU_IF_EVER_ENABLED: Readonly<Record<OptionId, BuId>> = {
  'need.payments.cross_border': 'cash_management',
  'need.payments.get_paid_faster': 'cash_management',
  'need.digitalising.cash_management': 'cash_management',
  'need.digitalising.trade': 'trade_finance',
  'need.managing_cash.working_capital': 'cash_management',
};

const UNROUTED: RoutingEntry = { primary: 'other_unrouted', secondary: null };

/**
 * Total. An unanswered need (the persistent exit taken before the need
 * node) or an id from an older deck falls to `other_unrouted` rather than
 * throwing — a lead that cannot be routed is still a lead.
 */
export function routeFor(needOptionId: OptionId | null): RoutingEntry {
  if (needOptionId === null) return UNROUTED;
  return ROUTING[needOptionId] ?? UNROUTED;
}

export const ALL_BUS = Object.keys(BUSINESS_UNITS) as BuId[];

/** The per-BU packs. `other_unrouted` has no owner, so it ships to nobody. */
export const EXPORTABLE_BUS: readonly BuId[] = ALL_BUS.filter(
  (bu) => bu !== 'other_unrouted',
);

export function buLabel(bu: BuId): string {
  return BUSINESS_UNITS[bu]?.label ?? bu;
}

export function buOwnerEmail(bu: BuId): string {
  return BUSINESS_UNITS[bu]?.ownerEmail ?? '';
}
