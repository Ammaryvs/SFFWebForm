'use client';

import { CTA_HEADLINE, EXPLORE_DESTINATION_URL, ctaOptionsFor } from '@/domain/cta';
import type { Band, CtaAction } from '@/domain/types';

/**
 * The CTA — spec §6.
 *
 * The headline is identical for all four bands: one that warmed for HOT and
 * cooled for EXPLORATORY would tell the visitor how they had been graded.
 * All three actions are always present and selectable — a HOT lead can
 * still just take a brochure, which is what makes Engagement a real signal.
 *
 * The band passed in here is the PROVISIONAL one. It decides emphasis and
 * nothing else; the visitor's choice then produces the final band.
 */

export function CtaScreen({
  provisionalBand,
  onChoose,
}: {
  provisionalBand: Band;
  onChoose: (action: CtaAction, wordingShown: string) => void;
}) {
  const options = ctaOptionsFor(provisionalBand);

  return (
    <div className="chrome">
      <div className="cta">
        <h1 className="cta__headline">{CTA_HEADLINE}</h1>

        {options.map((option) => (
          <button
            key={option.action}
            type="button"
            className={
              option.emphasised
                ? 'cta__option cta__option--emphasised'
                : 'cta__option'
            }
            onClick={() => {
              onChoose(option.action, option.label);
              if (option.action === 'explore') {
                window.open(EXPLORE_DESTINATION_URL, '_blank', 'noopener');
              }
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
