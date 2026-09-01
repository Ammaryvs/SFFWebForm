'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Stage } from '@/components/visitor/Stage';
import { CheckinForm } from '@/components/visitor/CheckinForm';
import { SpeechScreen } from '@/components/visitor/SpeechScreen';
import { NodeScreen } from '@/components/visitor/NodeScreen';
import { CtaScreen } from '@/components/visitor/CtaScreen';
import { Confirmation, Splash } from '@/components/visitor/Messages';
import { CURRENT_CONSENT } from '@/domain/checkin';
import {
  INTENT_NODE,
  INTEREST_NODE,
  NEED_NODES,
  THANKS_BEATS,
  TIMELINE_NODE,
  WELCOME_BEATS,
  clearAnswersFrom,
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

type Screen =
  | 'splash'
  | 'welcome'
  | 'checkin'
  | 'thanks'
  | 'node'
  | 'cta'
  | 'done';

interface Progress {
  screen: Screen;
  nodeId: NodeId;
  checkin: CheckinDetails | null;
  answers: Answers;
  /**
   * The nodes walked to get here, oldest first. Restored alongside the
   * answers so a visitor who reloads on dead wifi keeps the ability to
   * correct the answer they were mid-correcting.
   */
  history: NodeId[];
}

const EMPTY_ANSWERS: Answers = {
  interest: null,
  need: null,
  timeline: null,
  intent: null,
};

const PROGRESS_KEY = 'uob-booth.progress';

/**
 * Only a conversation in progress is worth restoring.
 *
 * Before the first answer there is nothing to preserve — the check-in form
 * holds its own field state and `checkin` is null until it is submitted —
 * so a snapshot at the greeting or the form restores literally nothing
 * while costing the visitor the greeting. Worse at a booth: a phone handed
 * to the next visitor in the same tab would open on a bare form with no
 * idea what it was for.
 */
function isResumable(progress: Progress): boolean {
  return (
    progress.screen === 'thanks' ||
    progress.screen === 'node' ||
    progress.screen === 'cta'
  );
}

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
  /**
   * The path taken, not the path available.
   *
   * Back is a stack rather than a reverse edge on the graph because the
   * graph has no reverse edge worth trusting: `timeline` is reached from
   * any of seven need nodes, so "the previous node" is only knowable from
   * what this visitor actually walked.
   */
  const [history, setHistory] = useState<NodeId[]>([]);

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
      if (restored && isResumable(restored)) {
        setScreen(restored.screen);
        setNodeId(restored.nodeId);
        setCheckin(restored.checkin);
        setAnswers(restored.answers);
        // A snapshot written before this field existed restores as a
        // visitor with nowhere to go back to, which is the safe reading.
        setHistory(restored.history ?? []);
        // Engagement means the `interest` node was reached. A visitor
        // resumed on the thank-you beat has not seen a question yet, so
        // theirs fires when they tap into the conversation, not here.
        if (restored.screen !== 'thanks') fireEngagementBeacon();
      } else {
        // A fresh visitor is greeted before they are asked for anything.
        setScreen('welcome');
      }
    });

    return () => {
      cancelled = true;
      stopDraining();
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, []);

  useEffect(() => {
    const progress: Progress = { screen, nodeId, checkin, answers, history };
    if (!isResumable(progress)) return;
    saveProgress(progress);
  }, [screen, nodeId, checkin, answers, history]);

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
    setHistory([]);
    // The receptionist thanks them for the form before the first question.
    setScreen('thanks');
  }, []);

  const handleThanksDone = useCallback(() => {
    setScreen('node');
    // On reaching the `interest` node — which is what Engagement counts,
    // so it fires here rather than on check-in.
    fireEngagementBeacon();
  }, []);

  const handleChoose = useCallback(
    (optionId: OptionId) => {
      setHistory((current) => [...current, nodeId]);

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
  const handleExit = useCallback(() => {
    setHistory((current) => [...current, nodeId]);
    setScreen('cta');
  }, [nodeId]);

  /**
   * One step back, discarding the answer being corrected and everything
   * downstream of it (see `clearAnswersFrom`).
   *
   * Deliberately NOT wired to the device back button. That gesture leaves
   * the app entirely on a phone that arrived by NFC tap, and a visitor who
   * means "undo that answer" would get "close the conversation" — which
   * under a single terminal submit means the lead is never captured at
   * all. The control on screen is the whole of the affordance.
   */
  const handleBack = useCallback(() => {
    const previous = history[history.length - 1];
    if (previous === undefined) return;

    setHistory(history.slice(0, -1));
    setNodeId(previous);
    setAnswers((current) => clearAnswersFrom(current, previous));
    setScreen('node');
  }, [history]);

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

  if (screen === 'welcome') {
    return (
      <Stage>
        <SpeechScreen
          beats={WELCOME_BEATS}
          onDone={() => setScreen('checkin')}
        />
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

  if (screen === 'thanks') {
    return (
      <Stage>
        <SpeechScreen beats={THANKS_BEATS} onDone={handleThanksDone} />
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
      <NodeScreen
        node={node}
        onChoose={handleChoose}
        onExit={handleExit}
        // The first question has nothing behind it but the receptionist's
        // thank-you, and a back that reopens a beat already spoken is
        // noise. Undefined, so NodeScreen renders no control at all.
        onBack={history.length > 0 ? handleBack : undefined}
      />
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
 *
 * Not in development, and the existing worker is torn down there.
 *
 * The build id is the cache key, and in development there isn't one — it
 * falls back to the constant `dev`, so the cache is never invalidated while
 * sw.js serves the shell's JS cache-first. The result is a dev server that
 * compiles a change happily and a phone that keeps replaying the bundle
 * from the first load, with no error anywhere to say so. The unregister is
 * what rescues a browser already holding one.
 *
 * This costs nothing real: the staleness rehearsal spec §11 asks for is
 * only meaningful against a production build anyway (`npm run build &&
 * npm start`), where the build id is genuine.
 */
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (process.env.NODE_ENV !== 'production') {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) void registration.unregister();
    });
    void caches
      ?.keys()
      .then((names) =>
        names
          .filter((name) => name.startsWith('uob-booth-'))
          .forEach((name) => void caches.delete(name)),
      )
      .catch(() => undefined);
    return;
  }

  const build = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
  void navigator.serviceWorker
    .register(`/sw.js?build=${encodeURIComponent(build)}`, { scope: '/' })
    .catch(() => undefined);
}
