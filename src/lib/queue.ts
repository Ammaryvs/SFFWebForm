/**
 * The submission queue — spec §11.
 *
 * One POST, at the CTA. The payload is a few hundred bytes, so
 * `localStorage` is the right store: IndexedDB buys nothing at this size.
 *
 * The payload is written to the queue BEFORE the network is attempted, so
 * it survives a POST killed mid-flight — a phone that leaves wifi range
 * halfway through the request still has the lead.
 *
 * The visitor sees none of this. The queue retries silently and no network
 * error is ever shown: nothing at a booth is improved by telling a stranger
 * the wifi is broken.
 */

import type { SubmitPayload } from '@/domain/types';

const QUEUE_KEY = 'uob-booth.queue';

/** 1s, 2s, 4s, 8s, 16s, then every 30s while the tab lives. */
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000, 30000];

/** Holding personal data on a stranger's phone indefinitely would
 *  contradict the retention position. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function read(): SubmitPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SubmitPayload[]) : [];
  } catch {
    return [];
  }
}

function write(items: SubmitPayload[]): void {
  try {
    if (items.length === 0) localStorage.removeItem(QUEUE_KEY);
    else localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {
    /* Storage full or disabled. The in-flight POST is still attempted. */
  }
}

function unexpired(items: SubmitPayload[]): SubmitPayload[] {
  const now = Date.now();
  return items.filter((item) => {
    const queued = Date.parse(item.queuedAt);
    return !Number.isFinite(queued) || now - queued <= MAX_AGE_MS;
  });
}

export function enqueue(payload: SubmitPayload): void {
  const items = unexpired(read()).filter(
    (item) => item.sessionId !== payload.sessionId,
  );
  items.push(payload);
  write(items);
}

function remove(sessionId: string): void {
  write(read().filter((item) => item.sessionId !== sessionId));
}

export function queueLength(): number {
  return read().length;
}

async function deliver(payload: SubmitPayload): Promise<boolean> {
  const response = await fetch('/api/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  });

  // 2xx is delivered. So is any 4xx: the payload is malformed or expired
  // and retrying it forever would just keep a stranger's personal data on
  // their phone. Only a 5xx or a thrown fetch is worth another attempt.
  return response.status < 500;
}

let draining = false;

/**
 * Drains the queue, oldest first. Safe to call at any time; concurrent
 * calls collapse into one.
 */
export async function flushQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    for (const payload of unexpired(read())) {
      try {
        if (await deliver(payload)) remove(payload.sessionId);
        else break; // Server-side failure: stop and let the timer retry.
      } catch {
        break; // Offline.
      }
    }
    write(unexpired(read()));
  } finally {
    draining = false;
  }
}

let attempt = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(): void {
  if (timer !== null) return;
  const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]!;
  timer = setTimeout(() => {
    timer = null;
    attempt += 1;
    void tick();
  }, delay);
}

async function tick(): Promise<void> {
  await flushQueue();
  if (queueLength() > 0) schedule();
  else attempt = 0;
}

/**
 * Submits one payload. Queue first, network second.
 *
 * Resolves as soon as the payload is durable — not when the server has it —
 * because the confirmation copy is identical whether the submission landed
 * or queued. It promises contact, which is true in both cases, and never
 * claims a delivery it cannot verify.
 */
export function submit(payload: SubmitPayload): void {
  enqueue(payload);
  attempt = 0;
  void tick();

  // A bonus, never the guarantee: Background Sync can drain a payload after
  // the tab closes, but it never fires on iOS Safari — a large share of a
  // Singapore audience. The reliable iOS path is the flush on next open.
  void registerBackgroundSync();
}

async function registerBackgroundSync(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    const sync = (
      registration as ServiceWorkerRegistration & {
        sync?: { register(tag: string): Promise<void> };
      }
    )?.sync;
    await sync?.register('uob-booth-submit');
  } catch {
    /* Unsupported. Expected on iOS. */
  }
}

/** Wire the retry triggers. Call once, on app open. */
export function startQueueDraining(): () => void {
  // On next app open, any queued payload flushes first. This is the
  // practical iOS recovery path.
  void tick();

  const onOnline = () => {
    attempt = 0;
    void tick();
  };
  const onVisible = () => {
    if (document.visibilityState === 'visible') void tick();
  };

  window.addEventListener('online', onOnline);
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    window.removeEventListener('online', onOnline);
    document.removeEventListener('visibilitychange', onVisible);
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
}
