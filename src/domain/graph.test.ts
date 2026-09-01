import { describe, expect, it } from 'vitest';
import {
  ALL_NODES,
  ALL_NPC_LINES,
  BACK_LABEL,
  CHOICE_LABEL_BUDGET,
  EXIT_OPTION,
  INTEREST_NODE,
  INTENT_NODE,
  NEED_NODES,
  NPC_LINE_BUDGET,
  TIMELINE_NODE,
  SPEECH_TAP_HINT,
  THANKS_BEATS,
  WELCOME_BEATS,
  clearAnswersFrom,
  needNodeIdFor,
  needOptionIds,
  nextNodeId,
} from './graph';
import type { Answers } from './types';

describe('the node graph — shape (spec §5)', () => {
  it('offers the seven Interests', () => {
    expect(INTEREST_NODE.options).toHaveLength(7);
  });

  it('has exactly one need node per Interest option', () => {
    expect(Object.keys(NEED_NODES)).toHaveLength(7);
    for (const option of INTEREST_NODE.options) {
      expect(needNodeIdFor(option.id)).toBeTruthy();
      expect(NEED_NODES[needNodeIdFor(option.id)!]).toBeDefined();
    }
  });

  it('has 40 need options in total', () => {
    expect(needOptionIds().size).toBe(40);
  });

  it('offers five timelines and three intents', () => {
    expect(TIMELINE_NODE.standard.options).toHaveLength(5);
    expect(TIMELINE_NODE.soft.options).toHaveLength(5);
    expect(INTENT_NODE.standard.options).toHaveLength(3);
    expect(INTENT_NODE.soft.options).toHaveLength(3);
  });

  it('gives the soft register the same option ids as the standard one', () => {
    // Soft wording changes the NPC line, never what is scored.
    expect(TIMELINE_NODE.soft.options.map((o) => o.id)).toEqual(
      TIMELINE_NODE.standard.options.map((o) => o.id),
    );
    expect(INTENT_NODE.soft.options.map((o) => o.id)).toEqual(
      INTENT_NODE.standard.options.map((o) => o.id),
    );
  });

  it('uses globally unique option ids', () => {
    const ids = ALL_NODES.flatMap((node) => node.options.map((o) => o.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('prefixes every option id with its own node id', () => {
    for (const node of ALL_NODES) {
      for (const option of node.options) {
        expect(option.id.startsWith(`${node.id}.`)).toBe(true);
      }
    }
  });

  it('keeps the exit out of the option lists', () => {
    // The exit is chrome on every node, not a choice — otherwise it would
    // fall into the need-option set that routing must cover.
    const ids = ALL_NODES.flatMap((node) => node.options.map((o) => o.id));
    expect(ids).not.toContain(EXIT_OPTION.id);
  });
});

describe('the node graph — uniform depth (spec §5)', () => {
  it('walks every path in exactly four nodes from interest to cta', () => {
    for (const interest of INTEREST_NODE.options) {
      const needNodeId = nextNodeId('interest', interest.id);
      expect(needNodeId).toBe(needNodeIdFor(interest.id));

      const needNode = NEED_NODES[needNodeId as keyof typeof NEED_NODES];
      expect(needNode).toBeDefined();

      for (const need of needNode!.options) {
        expect(nextNodeId(needNode!.id, need.id)).toBe('timeline');
      }
      for (const timeline of TIMELINE_NODE.standard.options) {
        expect(nextNodeId('timeline', timeline.id)).toBe('intent');
      }
      for (const intent of INTENT_NODE.standard.options) {
        expect(nextNodeId('intent', intent.id)).toBe('cta');
      }
    }
  });

  it('sends the exit straight to the cta from every node', () => {
    for (const node of ALL_NODES) {
      expect(nextNodeId(node.id, EXIT_OPTION.id)).toBe('cta');
    }
  });
});

describe('the node graph — copy budget (spec §4)', () => {
  it('keeps every NPC line inside 78 characters, both registers', () => {
    for (const { id, line } of ALL_NPC_LINES) {
      expect(
        line.length,
        `${id}: "${line}" is ${line.length} chars`,
      ).toBeLessThanOrEqual(NPC_LINE_BUDGET);
    }
  });

  it('keeps every option label inside 22 characters', () => {
    const labels = [
      ...ALL_NODES.flatMap((node) => node.options),
      EXIT_OPTION,
    ];
    for (const option of labels) {
      expect(
        option.label.length,
        `${option.id}: "${option.label}" is ${option.label.length} chars`,
      ).toBeLessThanOrEqual(CHOICE_LABEL_BUDGET);
    }
  });
});

describe("the receptionist's spoken screens (spec §4)", () => {
  const ALL_SPEECH = [...WELCOME_BEATS, ...THANKS_BEATS];
  const ALL_SPEECH_LINES = ALL_SPEECH.flat();

  it('keeps every spoken line inside the NPC line budget', () => {
    for (const line of ALL_SPEECH_LINES) {
      expect(
        line.length,
        `"${line}" is ${line.length} chars`,
      ).toBeLessThanOrEqual(NPC_LINE_BUDGET);
    }
  });

  it('keeps every beat to a boxful', () => {
    // The dialogue box holds three lines at the NPC budget (spec §4). A
    // fourth would either overflow the box or shrink the type.
    for (const beat of ALL_SPEECH) {
      expect(beat.length, beat.join(' / ')).toBeLessThanOrEqual(3);
    }
  });

  it('keeps the tap hint inside the choice label budget', () => {
    expect(SPEECH_TAP_HINT.length).toBeLessThanOrEqual(CHOICE_LABEL_BUDGET);
  });

  it('asks the visitor nothing', () => {
    // These are the screens with no choice panel: a question in the copy
    // would leave the visitor looking for options that are not there.
    for (const line of ALL_SPEECH_LINES) {
      expect(line, `"${line}" asks a question`).not.toContain('?');
    }
  });

  it('greets without promising anything about the visitor’s data', () => {
    // The data promise is the versioned consent block on check-in. A
    // friendlier restatement here would be a second, looser promise.
    const spoken = ALL_SPEECH_LINES.join(' ').toLowerCase();
    for (const word of ['privacy', 'consent', 'data', 'secure', 'safe']) {
      expect(spoken, `speech mentions "${word}"`).not.toMatch(
        new RegExp(`\b${word}\b`),
      );
    }
  });
});

describe('the node graph — visitor-facing prohibitions (spec §6)', () => {
  const forbidden = [
    'qualify',
    'qualified',
    'assess',
    'evaluate',
    'rank',
    'score',
    'hot',
    'warm',
    'exploratory',
    'business unit',
    'treasury',
    'business banking',
  ];

  it('never shows qualification language or a BU name', () => {
    const visitorCopy = [
      ...WELCOME_BEATS.flat(),
      ...THANKS_BEATS.flat(),
      ...ALL_NODES.map((n) => n.line),
      ...ALL_NODES.flatMap((n) => n.options.map((o) => o.label)),
      EXIT_OPTION.label,
      BACK_LABEL,
    ]
      .join(' \n ')
      .toLowerCase();

    for (const word of forbidden) {
      expect(visitorCopy, `visitor copy contains "${word}"`).not.toMatch(
        new RegExp(`\\b${word}\\b`),
      );
    }
  });
});

describe('the node graph — stepping back', () => {
  const full: Answers = {
    interest: 'interest.growing',
    need: 'need.growing.asean',
    timeline: 'timeline.immediate',
    intent: 'intent.actively_looking',
  };

  it('discards the answer of the node stepped back to, and every one after', () => {
    expect(clearAnswersFrom(full, 'interest')).toEqual({
      interest: null,
      need: null,
      timeline: null,
      intent: null,
    });

    expect(clearAnswersFrom(full, 'need.growing')).toEqual({
      interest: 'interest.growing',
      need: null,
      timeline: null,
      intent: null,
    });

    expect(clearAnswersFrom(full, 'timeline')).toEqual({
      interest: 'interest.growing',
      need: 'need.growing.asean',
      timeline: null,
      intent: null,
    });

    expect(clearAnswersFrom(full, 'intent')).toEqual({
      interest: 'interest.growing',
      need: 'need.growing.asean',
      timeline: 'timeline.immediate',
      intent: null,
    });
  });

  it('leaves an abandoned branch no way to reach the payload', () => {
    // The failure this exists to prevent: change your Interest, and the
    // need option from the branch you left must not survive to routing.
    const reconsidered = clearAnswersFrom(full, 'interest');
    expect(reconsidered.need).toBeNull();
  });

  it('clears nothing for a node that owns no answer', () => {
    expect(clearAnswersFrom(full, 'cta')).toEqual(full);
    expect(clearAnswersFrom(full, 'checkin')).toEqual(full);
  });

  it('is total on partly-answered state', () => {
    const partial: Answers = {
      interest: 'interest.just_exploring',
      need: null,
      timeline: null,
      intent: null,
    };
    expect(clearAnswersFrom(partial, 'timeline')).toEqual(partial);
  });

  it('offers a back label short enough for the chrome', () => {
    expect(BACK_LABEL.length).toBeLessThanOrEqual(CHOICE_LABEL_BUDGET);
  });
});
