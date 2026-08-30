import { describe, expect, it } from 'vitest';
import { needOptionIds } from './graph';
import {
  EXPORTABLE_BUS,
  ROUTING_CONFIG,
  buLabel,
  routeFor,
} from './routing';
import type { BuId, OptionId } from './types';

describe('routing coverage (spec §9)', () => {
  /**
   * The load-bearing test. The tree may change up to the event, and total
   * coverage is the one property that must not silently break: a need
   * option with no routing row is a lead nobody is asked to chase.
   */
  it('routes exactly the graph’s need options — no more, no fewer', () => {
    const configured = new Set(Object.keys(ROUTING_CONFIG.routing));
    const graph = needOptionIds();

    const unrouted = [...graph].filter((id) => !configured.has(id));
    const orphaned = [...configured].filter((id) => !graph.has(id));

    expect({ unrouted, orphaned }).toEqual({ unrouted: [], orphaned: [] });
    expect(configured.size).toBe(40);
  });

  it('names a real business unit for every option', () => {
    for (const entry of Object.values(ROUTING_CONFIG.routing)) {
      expect(ROUTING_CONFIG.businessUnits[entry.primary]).toBeDefined();
    }
  });

  it('leaves every secondary BU null', () => {
    // One lead with two owners is chased twice or not at all.
    for (const entry of Object.values(ROUTING_CONFIG.routing)) {
      expect(entry.secondary).toBeNull();
    }
  });

  it('ships eight business units with placeholder owner mailboxes', () => {
    expect(Object.keys(ROUTING_CONFIG.businessUnits)).toHaveLength(8);
    for (const bu of Object.values(ROUTING_CONFIG.businessUnits)) {
      expect(bu.label.length).toBeGreaterThan(0);
    }
  });
});

describe('the routing table (spec §9)', () => {
  const rows: [OptionId, BuId][] = [
    ['need.growing.local', 'business_banking'],
    ['need.growing.asean', 'business_banking'],
    ['need.growing.other_overseas', 'business_banking'],
    ['need.managing_cash.visibility', 'cash_management'],
    ['need.managing_cash.optimise_excess_cash', 'cash_management'],
    ['need.managing_cash.access_to_funds', 'cash_management'],
    ['need.managing_cash.working_capital', 'business_banking'],
    ['need.payments.cross_border', 'transaction_banking'],
    ['need.payments.reconciliation', 'transaction_banking'],
    ['need.financing.growth', 'business_banking'],
    ['need.financing.working_capital', 'business_banking'],
    ['need.financing.specific_investment', 'corporate_investment'],
    ['need.financing.trade', 'trade_finance'],
    ['need.managing_risk.fx_exposure', 'markets_treasury'],
    ['need.managing_risk.interest_rate', 'markets_treasury'],
    ['need.managing_risk.minimal_fx', 'other_unrouted'],
    ['need.digitalising.trade', 'digital'],
    ['need.digitalising.cash_management', 'digital'],
    ['need.just_exploring.growing', 'business_banking'],
    ['need.just_exploring.financing', 'business_banking'],
    ['need.just_exploring.cash', 'cash_management'],
    ['need.just_exploring.payments', 'transaction_banking'],
    ['need.just_exploring.risk', 'markets_treasury'],
    ['need.just_exploring.digitalising', 'digital'],
    ['need.just_exploring.nothing_specific', 'other_unrouted'],
  ];

  for (const [option, bu] of rows) {
    it(`routes ${option} to ${bu}`, () => {
      expect(routeFor(option).primary).toBe(bu);
    });
  }

  it('keys off the need option alone, never a path walk', () => {
    // `need.financing.trade` and `need.digitalising.trade` share a suffix
    // and must not collide.
    expect(routeFor('need.financing.trade').primary).toBe('trade_finance');
    expect(routeFor('need.digitalising.trade').primary).toBe('digital');
  });

  it('sends an unanswered or unknown need to other_unrouted', () => {
    expect(routeFor(null).primary).toBe('other_unrouted');
    expect(routeFor('need.payments.invented_option').primary).toBe(
      'other_unrouted',
    );
  });
});

describe('the export boundary (spec §9, §14)', () => {
  it('excludes other_unrouted from the per-BU packs', () => {
    expect(EXPORTABLE_BUS).toHaveLength(7);
    expect(EXPORTABLE_BUS).not.toContain('other_unrouted');
  });

  it('renders a BU id as its configured label', () => {
    expect(buLabel('transaction_banking')).toBe(
      ROUTING_CONFIG.businessUnits.transaction_banking.label,
    );
  });
});

describe('the two options scoring and routing agree on (spec §9)', () => {
  it('sends exactly the 10-point need options to other_unrouted', () => {
    const unrouted = Object.entries(ROUTING_CONFIG.routing)
      .filter(([, entry]) => entry.primary === 'other_unrouted')
      .map(([id]) => id)
      .sort();

    expect(unrouted).toEqual([
      'need.just_exploring.nothing_specific',
      'need.managing_risk.minimal_fx',
    ]);
  });
});
