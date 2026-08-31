'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage } from '@/components/visitor/Stage';
import { CheckinForm } from '@/components/visitor/CheckinForm';
import { NodeScreen } from '@/components/visitor/NodeScreen';
import { CtaScreen } from '@/components/visitor/CtaScreen';
import { Confirmation, Splash } from '@/components/visitor/Messages';
import { CURRENT_CONSENT } from '@/domain/checkin';
import {
  INTENT_NODE,
  INTEREST_NODE,
  NEED_NODES,
  TIMELINE_NODE,
  nextNodeId,
  registerFor,
} from '@/domain/graph';
import { scoreProvisional } from '@/domain/scoring';
import type {
  Answers,
  CheckinDetails,
  ConversationNode,
  CtaAction,
  IntentId,
  InterestId,
  NodeId,
  OptionId,
  SubmitPayload,
  TimelineId,
} from '@/domain/types';
import { submit, startQueueDraining, flushQueue } from '@/lib/queue';
import {
  fireEngagementBeacon,
  fireFootfallBeacon,
  getSessionId,
  getSource,
} from '@/lib/session';

/**
 * The visitor app — spec §4, §5, §11.
 *
 * Client-rendered with the entire node graph bundled as a static import, so
 * there is no network round trip per node. That single decision is what
 * makes the offline requirement cheap.
 *
 * Nothing is written until the CTA. No lead row exists until the visitor
 * reaches the end: a closed tab mid-tree is *meant* to leave nothing behind.
 */

type Screen = 'splash' | 'checkin' | 'node' | 'cta' | 'done';

interface Progress {
  screen: Screen;
  nodeId: NodeId;
  checkin: CheckinDetails | null;
  answers: Answers;
}

const EMPTY_ANSWERS: Answers = {
  interest: null,
  need: null,
  timeline: null,
  intent: null,
};

const PROGRESS_KEY = 'uob-booth.progress';

/**
 * In-progress state is held in sessionStorage so the app survives a
 * mid-conversation reload on dead wifi. It is the visitor's own device and
 * consent has already been given by the time anything personal is here; it
 * is cleared the moment the CTA is submitted.
 */
function loadProgress(): Progress | null {
  try {
    const raw = sessionStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Progress) : null;
  } catch {
    return null;
  }
}

function saveProgress(progress: Progress): void {
  try {
    sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

function clearProgress(): void {
  try {
    sessionStorage.removeItem(PROGRESS_KEY);
  } catch {
    /* ignore */
  }
}

export default function VisitorApp() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [nodeId, setNodeId] = useState<NodeId>('interest');
  const [checkin, setCheckin] = useState<CheckinDetails | null>(null);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);

  /* --------------------------------------------------------------- */
  /* App open                                                         */
  /* --------------------------------------------------------------- */

  useEffect(() => {
    // Before anything else: the footfall beacon. It carries no personal
    // data — it fires long before consent exists — and without it footfall
    // would silently mean "completed conversations".
    getSessionId();
    getSource();
    fireFootfallBeacon();

    // On next app open, any queued payload flushes first. This is the
    // practical iOS recovery path, where Background Sync never fires.
    const stopDraining = startQueueDraining();
    registerServiceWorker();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'flush-queue') void flushQueue();
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);

    const restored = loadProgress();
    let cancelled = false;

    void waitForFirstFrame().then(() => {
      if (cancelled) return;
      if (restored && restored.screen !== 'done') {
        setScreen(restored.screen);
        setNodeId(restored.nodeId);
        setCheckin(restored.checkin);
        setAnswers(restored.answers);
        if (restored.screen !== 'checkin') fireEngagementBeacon();
      } else {
        setScreen('checkin');
      }
    });

    return () => {
      cancelled = true;
      stopDraining();
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  useEffect(() => {
    if (screen === 'splash' || screen === 'done') return;
    saveProgress({ screen, nodeId, checkin, answers });
  }, [screen, nodeId, checkin, answers]);

  /* --------------------------------------------------------------- */
  /* The conversation                                                 */
  /* --------------------------------------------------------------- */

  const register = registerFor(answers.interest);

  const node: ConversationNode | null = useMemo(() => {
    if (nodeId === 'interest') return INTEREST_NODE;
    if (nodeId === 'timeline') return TIMELINE_NODE[register];
    if (nodeId === 'intent') return INTENT_NODE[register];
    return NEED_NODES[nodeId as keyof typeof NEED_NODES] ?? null;
  }, [nodeId, register]);

  const handleCheckin = useCallback((details: CheckinDetails) => {
    setCheckin(details);
    setNodeId('interest');
    setScreen('node');
    // On reaching the `interest` node.
    fireEngagementBeacon();
  }, []);

  const handleChoose = useCallback(
    (optionId: OptionId) => {
      setAnswers((current) => {
        if (nodeId === 'interest') {
          return { ...current, interest: optionId as InterestId };
        }
        if (nodeId === 'timeline') {
          return { ...current, timeline: optionId as TimelineId };
        }
        if (nodeId === 'intent') {
          return { ...current, intent: optionId as IntentId };
        }
        return { ...current, need: optionId };
      });

      const next = nextNodeId(nodeId, optionId);
      if (next === 'cta') setScreen('cta');
      else setNodeId(next);
    },
    [nodeId],
  );

  // The persistent exit, from any node, straight to the CTA.
  const handleExit = useCallback(() => setScreen('cta'), []);

  /* --------------------------------------------------------------- */
  /* The CTA — phase 1 of scoring feeds it, phase 2 comes out of it    */
  /* --------------------------------------------------------------- */

  const provisional = useMemo(
    () =>
      checkin
        ? scoreProvisional({
            answers,
            role: checkin.role,
            companyEmail: checkin.companyEmail,
          })
        : null,
    [answers, checkin],
  );

  const handleCta = useCallback(
    (action: CtaAction, wordingShown: string) => {
      if (!checkin) return;

      const payload: SubmitPayload = {
        sessionId: getSessionId(),
        checkin,
        answers,
        ctaAction: action,
        ctaWordingShown: wordingShown,
        consentVersion: CURRENT_CONSENT.version,
        consentAt: new Date().toISOString(),
        source: getSource(),
        queuedAt: new Date().toISOString(),
      };

      // Queue first, network second — so the payload survives a POST killed
      // mid-flight. The visitor sees the same confirmation either way.
      submit(payload);
      clearProgress();
      setScreen('done');
    },
    [answers, checkin],
  );

  /* --------------------------------------------------------------- */

  if (screen === 'splash') {
    return (
      <Stage dim>
        <Splash />
      </Stage>
    );
  }

  if (screen === 'done') {
    return (
      <Stage dim>
        <Confirmation />
      </Stage>
    );
  }

  if (screen === 'checkin') {
    return (
      <Stage>
        <CheckinForm onSubmit={handleCheckin} />
      </Stage>
    );
  }

  if (screen === 'cta') {
    return (
      <Stage>
        <CtaScreen
          provisionalBand={provisional?.provisionalBand ?? 'EXPLORATORY'}
          onChoose={handleCta}
        />
      </Stage>
    );
  }

  // A node id with no node behind it would strand the visitor. Send them to
  // the CTA instead, where they are still captured.
  if (!node) {
    return (
      <Stage>
        <CtaScreen
          provisionalBand={provisional?.provisionalBand ?? 'EXPLORATORY'}
          onChoose={handleCta}
        />
      </Stage>
    );
  }

  return (
    <Stage>
      <NodeScreen node={node} onChoose={handleChoose} onExit={handleExit} />
    </Stage>
  );
}

/**
 * Hold the splash until the webfont and the background are actually ready.
 * The fallback stack is not metrically identical, so rendering the first
 * node before the font loads shows the copy at the wrong metrics — and the
 * copy budget assumes the webfont loaded.
 */
async function waitForFirstFrame(): Promise<void> {
  const ready = Promise.allSettled([
    document.fonts?.ready,
    decodeBackground(),
  ]);
  // Never hold the visitor behind a slow hall network for more than a beat.
  const cap = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([ready, cap]);
}

function decodeBackground(): Promise<unknown> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = resolve;
    image.src = '/assets/background.webp';
  });
}

/**
 * Registered with the build id in the query string, so a deploy produces a
 * byte-different worker URL and a fresh precache. Combined with skipWaiting
 * and clients.claim in sw.js, a hotfix reaches a returning phone on its
 * next load rather than after the tab is closed.
 */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  const build = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
  void navigator.serviceWorker
    .register(`/sw.js?build=${encodeURIComponent(build)}`, { scope: '/' })
    .catch(() => undefined);
}
