'use client';

import { useEffect, useState } from 'react';
import { NPC_NAME, SPEECH_TAP_HINT } from '@/domain/graph';
import { SkipLayer, useTypewriter } from './Typewriter';

/**
 * The receptionist talking — spec §4, §6.
 *
 * Name plate and dialogue box only. These screens ask the visitor nothing,
 * so they have no choice panel: one beat per tap, and on the last beat the
 * screen hands over to whatever comes next.
 *
 * The box itself is the button. That keeps the tap target the size of the
 * copy the visitor is already reading, and keeps the screen keyboard- and
 * screen-reader-operable without putting a choice-shaped row underneath a
 * screen that has no choices.
 *
 * Each beat types itself out, and the tap hint appears only once she has
 * finished: on a screen whose only control is "continue", showing the
 * affordance while she is still mid-sentence invites the visitor to skip
 * past the greeting without reading it. A tap during the animation
 * completes the line instead of advancing, so nothing is ever lost to an
 * early tap — the beat is still there to read.
 */
export function SpeechScreen({
  beats,
  onDone,
}: {
  /** One entry per screen; its lines share the box. */
  beats: readonly (readonly string[])[];
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);

  // A second run of beats (a resumed session, a second visitor on the same
  // phone) must start from the first one.
  useEffect(() => setIndex(0), [beats]);

  // An index past the end would strand the visitor on a blank box; treat
  // it as the last beat, so the next tap moves them on.
  const beat = beats[index] ?? [];
  const isLast = index >= beats.length - 1;

  // The beat's lines share one box, so they are typed as one string and
  // split back out — she pauses at the line break like any other stop
  // rather than starting the second line over.
  const { shown, isTyping, skip } = useTypewriter(beat.join('\n'));

  return (
    <div className="chrome">
      <p className="nameplate pix">{NPC_NAME}</p>

      {/* Keyed on the beat so a screen reader announces each new one, the
          same way it announces each node's line. */}
      <button
        key={index}
        type="button"
        className="dialogbox dialogbox--speech"
        onClick={() => (isLast ? onDone() : setIndex(index + 1))}
      >
        {/* Typed for the eye; announced whole for everyone else. */}
        <span className="dialogbox__lines" aria-hidden="true">
          {/*
            Every row of the beat is rendered from the first character, each
            empty until it is reached. Mapping the typed text instead would
            add a row mid-sentence and shunt the box upward under the
            visitor's eyes.
          */}
          {beat.map((line, position) => (
            <span key={line} className="dialogbox__line">
              {shown.split('\n')[position] ?? ''}
            </span>
          ))}
        </span>
        <span className="visually-hidden" aria-live="polite">
          {beat.join(' ')}
        </span>

        <span
          className={
            isTyping ? 'dialogbox__hint dialogbox__hint--held' : 'dialogbox__hint'
          }
          aria-hidden="true"
        >
          {SPEECH_TAP_HINT}
        </span>
      </button>

      {isTyping ? <SkipLayer onSkip={skip} /> : null}
    </div>
  );
}
