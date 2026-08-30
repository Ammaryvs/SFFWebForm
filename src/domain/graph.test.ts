import { describe, expect, it } from 'vitest';
import {
  ALL_NODES,
  ALL_NPC_LINES,
  CHOICE_LABEL_BUDGET,
  EXIT_OPTION,
  INTEREST_NODE,
  INTENT_NODE,
  NEED_NODES,
  NPC_LINE_BUDGET,
  TIMELINE_NODE,
  needNodeIdFor,
  needOptionIds,
  nextNodeId,
} from './graph';

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
      ...ALL_NODES.map((n) => n.line),
      ...ALL_NODES.flatMap((n) => n.options.map((o) => o.label)),
      EXIT_OPTION.label,
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
