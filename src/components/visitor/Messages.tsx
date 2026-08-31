'use client';

import { CONFIRMATION_COPY, SPLASH_COPY } from '@/domain/cta';

/**
 * Splash and confirmation — spec §4, §6.
 *
 * Both are the same composition with the whole frame dimmed rather than a
 * bottom gradient.
 */

export function Splash() {
  return (
    <div className="centre">
      <p className="wordmark">{SPLASH_COPY.wordmark}</p>
      <div className="spinner" aria-hidden="true" />
      <p className="centre__small" role="status">
        {SPLASH_COPY.status}
      </p>
    </div>
  );
}

/**
 * Shown identically whether the submission landed or queued offline. It
 * promises contact — true in both cases — and never claims a delivery it
 * cannot verify. The visitor is never told the wifi is broken.
 */
export function Confirmation() {
  return (
    <div className="centre">
      <p className="centre__big" role="status">
        {CONFIRMATION_COPY.headline}
      </p>
      <p className="centre__small">{CONFIRMATION_COPY.subline}</p>
    </div>
  );
}
