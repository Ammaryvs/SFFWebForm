import { describe, expect, it } from 'vitest';
import { CTA_HEADLINE, ctaOptionsFor, emphasisedActionFor } from './cta';
import { CHOICE_LABEL_BUDGET } from './graph';
import type { Band, CtaAction } from './types';

const BANDS: Band[] = ['HOT', 'WARM', 'QUALIFIED', 'EXPLORATORY'];

describe('the CTA screen (spec §6)', () => {
  it('uses an identical headline for all four bands', () => {
    // A headline that warmed for HOT and cooled for EXPLORATORY would tell
    // the visitor how they had been graded.
    expect(CTA_HEADLINE).toBe('Thanks! How can we help from here?');
  });

  it('offers all three actions, always, in every band', () => {
    // A HOT lead can still just take a brochure — which is what makes
    // Engagement a real signal.
    for (const band of BANDS) {
      const options = ctaOptionsFor(band);
      expect(options.map((o) => o.action)).toEqual<CtaAction[]>([
        'bu_follow_up',
        'send_info',
        'explore',
      ]);
    }
  });

  it('emphasises exactly one action per band', () => {
    for (const band of BANDS) {
      const emphasised = ctaOptionsFor(band).filter((o) => o.emphasised);
      expect(emphasised).toHaveLength(1);
    }
  });

  it('emphasises the action the band calls for', () => {
    const expected: Record<Band, CtaAction> = {
      HOT: 'bu_follow_up',
      WARM: 'bu_follow_up',
      QUALIFIED: 'send_info',
      EXPLORATORY: 'explore',
    };
    for (const band of BANDS) {
      expect(emphasisedActionFor(band)).toBe(expected[band]);
      expect(ctaOptionsFor(band).find((o) => o.emphasised)?.action).toBe(
        expected[band],
      );
    }
  });

  it('ships four wordings across the three actions', () => {
    const wordings = new Set(
      BANDS.flatMap((band) => ctaOptionsFor(band).map((o) => o.label)),
    );
    expect([...wordings].sort()).toEqual([
      'Explore Solutions',
      'Request a Follow-Up',
      'Send Me Information',
      'Talk to a Specialist',
    ]);
  });

  it('softens only the follow-up wording, and only for WARM', () => {
    for (const band of BANDS) {
      const followUp = ctaOptionsFor(band)[0]!;
      expect(followUp.label).toBe(
        band === 'WARM' ? 'Request a Follow-Up' : 'Talk to a Specialist',
      );
    }
  });

  it('keeps the constant actions constant', () => {
    for (const band of BANDS) {
      const [, sendInfo, explore] = ctaOptionsFor(band);
      expect(sendInfo!.label).toBe('Send Me Information');
      expect(explore!.label).toBe('Explore Solutions');
    }
  });

  it('never shows the visitor a band, a score or qualification language', () => {
    const copy = [
      CTA_HEADLINE,
      ...BANDS.flatMap((band) => ctaOptionsFor(band).map((o) => o.label)),
    ]
      .join(' ')
      .toLowerCase();
    for (const word of ['hot', 'warm', 'qualified', 'exploratory', 'score']) {
      expect(copy).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  it('keeps every CTA label inside the choice budget', () => {
    for (const band of BANDS) {
      for (const option of ctaOptionsFor(band)) {
        expect(option.label.length).toBeLessThanOrEqual(CHOICE_LABEL_BUDGET);
      }
    }
  });
});
