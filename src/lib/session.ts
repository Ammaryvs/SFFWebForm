/**
 * Session identity and the two beacons — spec §10, §11.
 *
 * Client-only. The session id is minted on app open and held in
 * sessionStorage, so a mid-conversation reload is the same Session rather
 * than a second Tap.
 */

const SESSION_KEY = 'uob-booth.session-id';
const SOURCE_KEY = 'uob-booth.source';

export type Source = 'nfc' | 'tablet';

function readStorage(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    // Private mode, or storage disabled. Everything below degrades to a
    // fresh id, which costs one duplicated Tap and nothing else.
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function mintId(): string {
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Older Safari. RFC 4122 v4 shape, which the API routes validate.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

export function getSessionId(): string {
  const existing = readStorage(sessionStorage, SESSION_KEY);
  if (existing) return existing;
  const minted = mintId();
  writeStorage(sessionStorage, SESSION_KEY, minted);
  return minted;
}

/**
 * `?src=tablet` marks the offline fallback device, so its conversations are
 * distinguishable from real NFC taps in the funnel. Sticky for the tab.
 */
export function getSource(): Source {
  const fromUrl = new URLSearchParams(window.location.search).get('src');
  if (fromUrl === 'tablet' || fromUrl === 'nfc') {
    writeStorage(sessionStorage, SOURCE_KEY, fromUrl);
    return fromUrl;
  }
  return readStorage(sessionStorage, SOURCE_KEY) === 'tablet'
    ? 'tablet'
    : 'nfc';
}

/**
 * Fire-and-forget. Both beacons carry NO personal data — the footfall one
 * fires before consent exists — and neither is ever retried. An occasional
 * loss slightly understates a headline count, which is accepted; what is
 * not acceptable is footfall silently meaning "completed conversations".
 */
function fire(type: 'footfall' | 'engagement'): void {
  const body = JSON.stringify({
    type,
    sessionId: getSessionId(),
    userAgent: navigator.userAgent,
    source: getSource(),
    at: new Date().toISOString(),
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/beacon',
        new Blob([body], { type: 'application/json' }),
      );
      return;
    }
  } catch {
    /* fall through */
  }

  void fetch('/api/beacon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

const fired = new Set<string>();

/** On app open, before anything else. */
export function fireFootfallBeacon(): void {
  if (fired.has('footfall')) return;
  fired.add('footfall');
  fire('footfall');
}

/** On reaching the `interest` node. */
export function fireEngagementBeacon(): void {
  if (fired.has('engagement')) return;
  fired.add('engagement');
  fire('engagement');
}
