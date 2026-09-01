'use client';

import { CTA_HEADLINE, EXPLORE_DESTINATION_URL, ctaOptionsFor } from '@/domain/cta';
import type { Band, CtaAction } from '@/domain/types';
import { SkipLayer, useTypewriter } from './Typewriter';

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
 *
 * The headline types out like every other line she speaks, but unlike the
 * question nodes the three actions stay LIVE while it does. This is the one
 * screen that captures anything: a visitor who taps straight through gets
 * their lead written, and gating that behind an animation to protect a
 * headline nobody misreads would trade the only thing the booth is for
 * against a detail of the presentation.
 */

export function CtaScreen({
  provisionalBand,
  onChoose,
}: {
  provisionalBand: Band;
  onChoose: (action: CtaAction, wordingShown: string) => void;
}) {
  const options = ctaOptionsFor(provisionalBand);
  const { shown, isTyping, skip } = useTypewriter(CTA_HEADLINE);

  return (
    <div className="chrome">
      {/*
        The panel is raised above the skip layer (see .cta in globals.css)
        so the three actions stay tappable, and carries the skip itself
        while she is talking — otherwise the one region of the screen a
        visitor is actually looking at would be the one region a tap did
        nothing in.
      */}
      <div className="cta" onClick={isTyping ? skip : undefined}>
        <h1 className="cta__headline">
          <span aria-hidden="true">{shown}</span>
          <span className="visually-hidden">{CTA_HEADLINE}</span>
        </h1>

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

      {/* The rest of the screen. */}
      {isTyping ? <SkipLayer onSkip={skip} /> : null}
    </div>
  );
}
