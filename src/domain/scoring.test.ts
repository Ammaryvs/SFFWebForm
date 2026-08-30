import { describe, expect, it } from 'vitest';
import {
  bandFor,
  emailDomain,
  finaliseScore,
  isCorporateDomain,
  scoreProvisional,
} from './scoring';
import { INTEREST_NODE, NEED_NODES, INTENT_NODE, TIMELINE_NODE } from './graph';
import type {
  Answers,
  CtaAction,
  IntentId,
  InterestId,
  OptionId,
  RoleId,
  TimelineId,
} from './types';

function session(
  need: OptionId | null,
  timeline: TimelineId | null,
  intent: IntentId | null,
  role: RoleId,
  companyEmail: string,
  interest: InterestId = 'interest.payments',
) {
  const answers: Answers = {
    interest: need === null ? null : interest,
    need,
    timeline,
    intent,
  };
  return scoreProvisional({ answers, role, companyEmail });
}

describe('email domain fit (spec §8)', () => {
  it('lowercases and extracts the domain', () => {
    expect(emailDomain('Ammar.Yusri@ABC.com.SG')).toBe('abc.com.sg');
  });

  it('scores a corporate domain 10 and a free-mail domain 0', () => {
    expect(isCorporateDomain('abc.com.sg')).toBe(true);
    expect(isCorporateDomain('gmail.com')).toBe(false);
    expect(isCorporateDomain('yahoo.com.sg')).toBe(false);
    expect(isCorporateDomain('outlook.com')).toBe(false);
    expect(isCorporateDomain('163.com')).toBe(false);
    expect(isCorporateDomain('proton.me')).toBe(false);
  });

  it('never rejects a free-mail address — it only scores zero', () => {
    const scored = session(
      'need.payments.cross_border',
      'timeline.immediate',
      'intent.actively_looking',
      'owner_c_suite_director',
      'someone@gmail.com',
    );
    expect(scored.breakdown.fitPoints).toBe(0);
    expect(scored.provisionalScore).toBe(80);
  });
});

describe('bands (spec §8)', () => {
  it('maps scores to bands at the documented boundaries', () => {
    expect(bandFor(100)).toBe('HOT');
    expect(bandFor(80)).toBe('HOT');
    expect(bandFor(79)).toBe('WARM');
    expect(bandFor(60)).toBe('WARM');
    expect(bandFor(59)).toBe('QUALIFIED');
    expect(bandFor(40)).toBe('QUALIFIED');
    expect(bandFor(39)).toBe('EXPLORATORY');
    expect(bandFor(0)).toBe('EXPLORATORY');
  });
});

describe('phase 1 — the provisional score (spec §8)', () => {
  it('caps at 90, so HOT is reachable before the CTA', () => {
    const best = session(
      'need.payments.cross_border',
      'timeline.immediate',
      'intent.actively_looking',
      'owner_c_suite_director',
      'cfo@abc.com.sg',
    );
    expect(best.provisionalScore).toBe(90);
    expect(best.provisionalBand).toBe('HOT');
  });

  it('floors at 20 for a complete session, never 0', () => {
    const thinnest = session(
      'need.just_exploring.nothing_specific',
      'timeline.no_timeline',
      'intent.researching',
      'executive_analyst_other',
      'someone@gmail.com',
      'interest.just_exploring',
    );
    expect(thinnest.provisionalScore).toBe(20);
    expect(thinnest.provisionalBand).toBe('EXPLORATORY');
  });

  it('scores a concrete need 25 and a non-committal one 10', () => {
    const concrete = session(
      'need.managing_risk.fx_exposure',
      null,
      null,
      'manager_finance',
      'a@abc.com',
    );
    expect(concrete.breakdown.needPoints).toBe(25);

    for (const soft of [
      'need.just_exploring.nothing_specific',
      'need.managing_risk.minimal_fx',
    ]) {
      expect(
        session(soft, null, null, 'manager_finance', 'a@abc.com').breakdown
          .needPoints,
      ).toBe(10);
    }
  });

  it('scores every timeline, intent and role option', () => {
    const timelinePoints: Record<TimelineId, number> = {
      'timeline.immediate': 20,
      'timeline.1_3_months': 15,
      'timeline.3_6_months': 10,
      'timeline.6_12_months': 5,
      'timeline.no_timeline': 0,
    };
    for (const option of TIMELINE_NODE.standard.options) {
      const scored = session(
        'need.payments.cross_border',
        option.id as TimelineId,
        'intent.researching',
        'manager_finance',
        'a@abc.com',
      );
      expect(scored.breakdown.timelinePoints).toBe(
        timelinePoints[option.id as TimelineId],
      );
    }

    const intentPoints: Record<IntentId, number> = {
      'intent.actively_looking': 20,
      'intent.considering': 10,
      'intent.researching': 5,
    };
    for (const option of INTENT_NODE.standard.options) {
      const scored = session(
        'need.payments.cross_border',
        'timeline.no_timeline',
        option.id as IntentId,
        'manager_finance',
        'a@abc.com',
      );
      expect(scored.breakdown.intentPoints).toBe(
        intentPoints[option.id as IntentId],
      );
    }

    const influence: Record<RoleId, number> = {
      owner_c_suite_director: 15,
      manager_finance: 10,
      executive_analyst_other: 5,
    };
    for (const [role, points] of Object.entries(influence) as [
      RoleId,
      number,
    ][]) {
      expect(
        session(
          'need.payments.cross_border',
          'timeline.no_timeline',
          'intent.researching',
          role,
          'a@abc.com',
        ).breakdown.influencePoints,
      ).toBe(points);
    }
  });

  it('scores every need option in the graph as 25 or 10', () => {
    for (const node of Object.values(NEED_NODES)) {
      for (const option of node.options) {
        const points = session(
          option.id,
          null,
          null,
          'manager_finance',
          'a@abc.com',
        ).breakdown.needPoints;
        expect([10, 25], `${option.id} scored ${points}`).toContain(points);
      }
    }
  });
});

describe('incomplete sessions (spec §8)', () => {
  it('scores unanswered categories 0', () => {
    const exited = session(
      'need.payments.cross_border',
      null,
      null,
      'owner_c_suite_director',
      'cfo@abc.com',
    );
    expect(exited.breakdown.timelinePoints).toBe(0);
    expect(exited.breakdown.intentPoints).toBe(0);
    expect(exited.provisionalScore).toBe(50);
  });

  it('caps an incomplete session at EXPLORATORY while keeping the raw score', () => {
    const exited = session(
      'need.payments.cross_border',
      null,
      null,
      'owner_c_suite_director',
      'cfo@abc.com',
    );
    expect(exited.isIncomplete).toBe(true);
    expect(exited.provisionalBand).toBe('EXPLORATORY');

    const final = finaliseScore(exited, 'bu_follow_up');
    expect(final.finalScore).toBe(60);
    expect(final.band).toBe('EXPLORATORY');
  });

  it('treats a session that never reached the first node as incomplete', () => {
    const bailed = session(null, null, null, 'manager_finance', 'a@abc.com');
    expect(bailed.isIncomplete).toBe(true);
    expect(bailed.breakdown.needPoints).toBe(0);
    expect(bailed.provisionalScore).toBe(20);
    expect(bailed.provisionalBand).toBe('EXPLORATORY');
  });

  it('marks a session that answered all four nodes complete', () => {
    const complete = session(
      'need.payments.cross_border',
      'timeline.immediate',
      'intent.actively_looking',
      'owner_c_suite_director',
      'cfo@abc.com',
    );
    expect(complete.isIncomplete).toBe(false);
  });
});

describe('phase 2 — engagement (spec §8)', () => {
  it('adds 10 for the BU follow-up action and nothing for the others', () => {
    const provisional = session(
      'need.payments.reconciliation',
      'timeline.3_6_months',
      'intent.considering',
      'manager_finance',
      'a@abc.com',
    );
    const cases: [CtaAction, number][] = [
      ['bu_follow_up', 10],
      ['send_info', 0],
      ['explore', 0],
    ];
    for (const [action, points] of cases) {
      const final = finaliseScore(provisional, action);
      expect(final.engagementPoints).toBe(points);
      expect(final.finalScore).toBe(provisional.provisionalScore + points);
    }
  });

  it('lets a lead move up a band by asking for a specialist', () => {
    const provisional = session(
      'need.financing.growth',
      'timeline.1_3_months',
      'intent.actively_looking',
      'manager_finance',
      'a@abc.com',
    );
    expect(provisional.provisionalScore).toBe(80);
    expect(provisional.provisionalBand).toBe('HOT');

    const borderline = session(
      'need.financing.growth',
      'timeline.3_6_months',
      'intent.researching',
      'executive_analyst_other',
      'a@abc.com',
    );
    expect(borderline.provisionalScore).toBe(55);
    expect(borderline.provisionalBand).toBe('QUALIFIED');
    expect(finaliseScore(borderline, 'bu_follow_up').band).toBe('WARM');
  });

  it('stamps the scoring version onto the result', () => {
    const final = finaliseScore(
      session(
        'need.payments.too_manual',
        'timeline.immediate',
        'intent.considering',
        'manager_finance',
        'a@abc.com',
      ),
      'send_info',
    );
    expect(final.scoringVersion).toBe('v1');
  });
});

describe('the five worked examples (spec §8)', () => {
  const examples: {
    n: number;
    need: OptionId;
    timeline: TimelineId;
    intent: IntentId;
    role: RoleId;
    email: string;
    interest: InterestId;
    breakdown: [number, number, number, number, number];
    provisional: number;
    provisionalBand: string;
    action: CtaAction;
    final: number;
    band: string;
  }[] = [
    {
      n: 1,
      need: 'need.financing.working_capital',
      timeline: 'timeline.1_3_months',
      intent: 'intent.actively_looking',
      role: 'owner_c_suite_director',
      email: 'cfo@abc.com.sg',
      interest: 'interest.financing',
      breakdown: [25, 15, 20, 15, 10],
      provisional: 85,
      provisionalBand: 'HOT',
      action: 'bu_follow_up',
      final: 95,
      band: 'HOT',
    },
    {
      n: 2,
      need: 'need.payments.reconciliation',
      timeline: 'timeline.3_6_months',
      intent: 'intent.considering',
      role: 'manager_finance',
      email: 'fm@abc.com.sg',
      interest: 'interest.payments',
      breakdown: [25, 10, 10, 10, 10],
      provisional: 65,
      provisionalBand: 'WARM',
      action: 'send_info',
      final: 65,
      band: 'WARM',
    },
    {
      n: 3,
      need: 'need.digitalising.reporting',
      timeline: 'timeline.6_12_months',
      intent: 'intent.researching',
      role: 'executive_analyst_other',
      email: 'analyst@abc.com.sg',
      interest: 'interest.digitalising',
      breakdown: [25, 5, 5, 5, 10],
      provisional: 50,
      provisionalBand: 'QUALIFIED',
      action: 'send_info',
      final: 50,
      band: 'QUALIFIED',
    },
    {
      n: 4,
      need: 'need.just_exploring.nothing_specific',
      timeline: 'timeline.no_timeline',
      intent: 'intent.researching',
      role: 'executive_analyst_other',
      email: 'someone@gmail.com',
      interest: 'interest.just_exploring',
      breakdown: [10, 0, 5, 5, 0],
      provisional: 20,
      provisionalBand: 'EXPLORATORY',
      action: 'explore',
      final: 20,
      band: 'EXPLORATORY',
    },
    {
      // The lead a "Just Exploring" bypass would have thrown away.
      n: 5,
      need: 'need.just_exploring.payments',
      timeline: 'timeline.immediate',
      intent: 'intent.actively_looking',
      role: 'owner_c_suite_director',
      email: 'director@abc.com.sg',
      interest: 'interest.just_exploring',
      breakdown: [25, 20, 20, 15, 10],
      provisional: 90,
      provisionalBand: 'HOT',
      action: 'bu_follow_up',
      final: 100,
      band: 'HOT',
    },
  ];

  for (const example of examples) {
    it(`example ${example.n} scores ${example.final} ${example.band}`, () => {
      const provisional = session(
        example.need,
        example.timeline,
        example.intent,
        example.role,
        example.email,
        example.interest,
      );
      const b = provisional.breakdown;
      expect([
        b.needPoints,
        b.timelinePoints,
        b.intentPoints,
        b.influencePoints,
        b.fitPoints,
      ]).toEqual(example.breakdown);
      expect(provisional.provisionalScore).toBe(example.provisional);
      expect(provisional.provisionalBand).toBe(example.provisionalBand);

      const final = finaliseScore(provisional, example.action);
      expect(final.finalScore).toBe(example.final);
      expect(final.band).toBe(example.band);
    });
  }
});
