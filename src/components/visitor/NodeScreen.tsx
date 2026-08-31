'use client';

import { useEffect, useRef } from 'react';
import { EXIT_OPTION } from '@/domain/graph';
import type { ConversationNode, OptionId } from '@/domain/types';

/**
 * A conversation node — spec §4, §5, §6.
 *
 * Name plate, dialogue box, choice panel. The panel scrolls: seven
 * Interests plus the exit against roughly four visible rows, so the scroll
 * affordance is required, and rows are at least 44px.
 */

const NPC_NAME = 'RECEPTIONIST';

export function NodeScreen({
  node,
  onChoose,
  onExit,
}: {
  node: ConversationNode;
  onChoose: (optionId: OptionId) => void;
  onExit: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Each node is a fresh panel: start it at the top, or a visitor arriving
  // from a long list lands mid-way down the next one.
  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [node.id]);

  return (
    <div className="chrome">
      <p className="nameplate pix">{NPC_NAME}</p>

      {/*
        The NPC acknowledges each answer before the next question, which is
        what makes this a conversation rather than a form — and confirms to
        the visitor that a tap in a scrolling panel registered. Announced to
        a screen reader for the same reason.
      */}
      <p className="dialogbox" aria-live="polite" key={node.id}>
        {node.line}
      </p>

      <div
        className="choices"
        ref={panelRef}
        role="group"
        aria-label="Choose an answer"
      >
        {node.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className="opt"
            onClick={() => onChoose(option.id)}
          >
            <span className="opt__marker" aria-hidden="true">
              ▸
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
            ⏭
          </span>
          <span>{EXIT_OPTION.label}</span>
        </button>

        <span className="choices__scrollhint" aria-hidden="true">
          ▼ scroll for more
        </span>
      </div>
    </div>
  );
}
