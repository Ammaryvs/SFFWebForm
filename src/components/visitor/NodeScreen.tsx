'use client';

import { useEffect, useRef } from 'react';
import { BACK_LABEL, EXIT_OPTION, NPC_NAME } from '@/domain/graph';
import type { ConversationNode, OptionId } from '@/domain/types';
import { SkipLayer, useTypewriter } from './Typewriter';

/**
 * A conversation node — spec §4, §5, §6.
 *
 * Name plate, dialogue box, choice panel. The panel scrolls: seven
 * Interests plus the exit against roughly four visible rows, so the scroll
 * affordance is required, and rows are at least 44px.
 *
 * Back sits on the name-plate row rather than in the choice panel. Three
 * reasons, in order: a row in the panel would read as something the
 * receptionist offered — an answer — when it is a correction to the last
 * one; it would sit next to the exit, where a mis-tap costs the visitor
 * the rest of the conversation; and the panel's row order is a measured
 * quantity (spec §13, `interestRank`), so adding a row to it would move
 * the below-the-fold bias the metric is trying to hold still.
 *
 * The line types itself out and the choice panel is inert until it
 * finishes. That ordering is the point: an answer given to a question the
 * visitor has not finished reading is a wrong answer that scores and routes
 * exactly like a right one, and a tap during the animation skips it rather
 * than choosing.
 */

export function NodeScreen({
  node,
  onChoose,
  onExit,
  onBack,
}: {
  node: ConversationNode;
  onChoose: (optionId: OptionId) => void;
  onExit: () => void;
  /** Absent on the first question, which has nothing behind it. */
  onBack?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { shown, isTyping, skip } = useTypewriter(node.line);

  // Each node is a fresh panel: start it at the top, or a visitor arriving
  // from a long list lands mid-way down the next one.
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [node.id]);

  return (
    <div className="chrome">
      <div className="chrome__header">
        <p className="nameplate pix">{NPC_NAME}</p>

        {/*
          Rendered only when there is somewhere to go. A disabled or
          invisible-but-present control on the first question would leave a
          gap in the row that the visitor learns to ignore before it ever
          becomes useful.

          The marker points the opposite way to the `>` on every choice
          row, which is the whole of the explanation this needs.
        */}
        {onBack ? (
          <button
            type="button"
            className="backstep"
            onClick={onBack}
            aria-label="Back to the previous question"
          >
            <span className="backstep__marker" aria-hidden="true">
              &lt;
            </span>
            <span>{BACK_LABEL}</span>
          </button>
        ) : null}
      </div>

      {/*
        The NPC acknowledges each answer before the next question, which is
        what makes this a conversation rather than a form — and confirms to
        the visitor that a tap in a scrolling panel registered. Announced to
        a screen reader for the same reason.

        The typed text is hidden from assistive technology and the whole
        line announced beside it: a live region fed one character at a time
        is unusable, and a screen-reader user gains nothing from watching
        the animation they cannot see.
      */}
      <p className="dialogbox">
        <span aria-hidden="true">{shown}</span>
        <span className="visually-hidden" aria-live="polite" key={node.id}>
          {node.line}
        </span>
      </p>

      <div
        className={isTyping ? 'choices choices--pending' : 'choices'}
        ref={panelRef}
        role="group"
        aria-label="Choose an answer"
        // Dimmed AND inert while she is still talking, so the panel looks
        // exactly as available as it is. `inert` also keeps a keyboard and
        // a screen reader out, which `pointer-events` alone would not.
        inert={isTyping}
      >
        {node.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="opt"
            onClick={() => onChoose(option.id)}
          >
            <span className="opt__marker" aria-hidden="true">
              &gt;
            </span>
            <span>{option.label}</span>
          </button>
        ))}

        {/*
          The persistent exit. Under a single terminal submit this is the
          only route by which a departing visitor is captured at all, so it
          is rendered prominently rather than as a grudging grey row — and
          its label is deliberately not Interest-shaped.
        */}
        <button type="button" className="opt opt--exit" onClick={onExit}>
          <span className="opt__marker" aria-hidden="true">
            &gt;&gt;
          </span>
          <span>{EXIT_OPTION.label}</span>
        </button>

        <span className="choices__scrollhint" aria-hidden="true">
          scroll for more
        </span>
      </div>

      {isTyping ? <SkipLayer onSkip={skip} /> : null}
    </div>
  );
}
