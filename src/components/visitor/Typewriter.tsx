'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The receptionist's dialogue, typed out — spec §4, §6.
 *
 * Every line she speaks arrives character by character, the way an NPC in a
 * game speaks, and a tap anywhere completes it instantly.
 *
 * The skip is not a nicety. Typed dialogue is a delay imposed on somebody
 * standing at a booth, and the second visitor of the day already knows what
 * the line says. Without a skip the animation would be a tax on exactly the
 * people most willing to talk; with one it costs nothing, so it can be
 * slow enough to read as speech.
 */

/**
 * Milliseconds per character. Roughly 38 characters a second — near the
 * fast end of the range games use, because the visitor is standing up and
 * a 78-character line (the spec §4 budget) has to land in about two
 * seconds.
 */
export const TYPE_MS_PER_CHAR = 26;

/**
 * Characters worth a pause, and how many ticks they hold for.
 *
 * This is the whole difference between a line that reads as speech and one
 * that reads as a progress bar: the ear expects a breath at a comma and a
 * stop at a full stop, and a constant rate reads as a machine.
 */
const PAUSE_TICKS: Readonly<Record<string, number>> = {
  ',': 3,
  '—': 3,
  ':': 3,
  '.': 6,
  '!': 6,
  '?': 6,
  '\n': 6,
};

export interface Typewriter {
  /** The text revealed so far. Split on `\n` to render multiple lines. */
  readonly shown: string;
  readonly isTyping: boolean;
  /** Reveal the rest at once. Idempotent. */
  readonly skip: () => void;
}

/**
 * Type out `text`, restarting whenever it changes.
 *
 * Takes the full string rather than a node id so it is the copy itself that
 * drives the restart: two nodes can share a line, and a visitor who steps
 * back to one should see it typed again.
 */
export function useTypewriter(text: string): Typewriter {
  const [count, setCount] = useState(0);
  const instant = usePrefersReducedMotion();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (instant || text.length === 0) {
      setCount(text.length);
      return;
    }

    setCount(0);
    let revealed = 0;

    // A self-rescheduling timeout rather than an interval, so a comma can
    // hold for longer than a letter without the queue drifting.
    const tick = () => {
      revealed += 1;
      setCount(revealed);
      if (revealed >= text.length) {
        timer.current = null;
        return;
      }
      const held = PAUSE_TICKS[text.charAt(revealed - 1)] ?? 1;
      timer.current = setTimeout(tick, TYPE_MS_PER_CHAR * held);
    };

    timer.current = setTimeout(tick, TYPE_MS_PER_CHAR);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [text, instant]);

  const skip = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setCount(text.length);
  }, [text]);

  return { shown: text.slice(0, count), isTyping: count < text.length, skip };
}

/**
 * The tap-to-skip surface: the whole screen, while a line is still typing.
 *
 * Full-screen on purpose. A visitor mid-sentence should not have to find
 * anything, and it also means a tap aimed at a choice row lands here
 * instead — they cannot answer a question they have not finished reading.
 *
 * Hidden from assistive technology because it duplicates the keyboard path
 * below and has nothing to say; a screen reader has already been given the
 * whole line by the time this exists.
 *
 * The keydown is deliberately not prevented: a key pressed on a control
 * that is genuinely live — the CTA's actions, the spoken screen's box —
 * should still work it. Skipping is what a key does when there is nothing
 * else for it to do.
 */
export function SkipLayer({ onSkip }: { onSkip: () => void }) {
  useEffect(() => {
    const onKeyDown = () => onSkip();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSkip]);

  // onClick, not onPointerDown: removing this layer on press would let the
  // release land on whatever was underneath it.
  return <div className="skiplayer" aria-hidden="true" onClick={onSkip} />;
}

/**
 * Typed dialogue is motion, and a visitor who has asked their phone for
 * less of it gets the line whole. `.dialogbox` never moves, so there is
 * nothing else here to soften.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
